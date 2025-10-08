import crypto from 'crypto';

import { SchemaValidators, canonicalJson, loadTemplateVersioned, PromptRefinementInput, RefinedPromptV1, StudyPlanV1, getRawSchemas } from '../schemas';
import type { LLMAdapter } from '../adapters/llm/LLMAdapter';

export type RefinementResult = { refinedPrompt: RefinedPromptV1; studyPlan: StudyPlanV1; attempts: number };

export type RefinementErrorCode = 'LLM_TIMEOUT' | 'LLM_429' | 'LLM_MALFORMED' | 'SCHEMA_INVALID';

export class RefinementError extends Error {
  constructor(
    message: string,
    readonly code: RefinementErrorCode,
    readonly retryable: boolean,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'RefinementError';
  }
}

export interface RefinementOptions {
  timeoutMs?: number; // default 8000 / cap 16000 per p90
  maxRetries429?: number; // default 1 (single retry)
  autoStripAdditionalPropsDefault?: boolean; // when true, permit auto-stripping extras on failure
}

export interface RefinementFlags {
  autoStripAdditionalProps?: boolean;
}

export class RefinementService {
  private validators = new SchemaValidators();
  private template = loadTemplateVersioned();

  constructor(private llm: LLMAdapter, private opts: RefinementOptions = {}) {}

  // Debug logger gated by LOG_LEVEL=debug
  private debug(event: string, data: Record<string, unknown> = {}) {
    if ((process.env.LOG_LEVEL || '').toLowerCase() === 'debug') {
      // Use console.debug with structured JSON for easy filtering
      console.debug(JSON.stringify({ level: 'debug', component: 'refinement', event, ...data }));
    }
  }

  normalizeInput(input: PromptRefinementInput & { weights?: Record<string, number> }): PromptRefinementInput {
    const goal = input.goal.trim().replace(/\s+/g, ' ');
    const contextRefs = Array.from(new Set((input.contextRefs || []).map((s: string) => s.trim()).filter(Boolean))).slice(0, 8);

    // Accept both lensWeights (design) and weights (current schema) from the client
    const incoming = input.lensWeights ?? input.weights;
    const lensWeights = incoming
      ? Object.fromEntries(Object.entries(incoming).map(([k, v]) => [k, clamp(Number(v), 0, 1)]))
      : undefined;

    const normalized = { goal, contextRefs, lensWeights } as PromptRefinementInput;
    this.debug('input_normalized', { goal_len: goal.length, context_refs: contextRefs.length, has_weights: Boolean(lensWeights) });
    return normalized;
  }

  async refine(
    rawInput: unknown,
    correlationId: string,
    flags: RefinementFlags = {}
  ): Promise<RefinementResult> {
    if (!this.validators.validatePromptRefinementInput(rawInput)) {
      const errs = this.validators.errorsToPointers();
      this.debug('input_invalid', { correlation_id: correlationId, errors: errs });
      throw new RefinementError('Invalid input', 'SCHEMA_INVALID', false, { errors: errs });
    }
    const input = this.normalizeInput(rawInput as any);

    const { prompt, weights } = this.composePrompt(input);
    this.debug('prompt_composed', { correlation_id: correlationId, prompt_bytes: Buffer.byteLength(prompt), weights_keys: Object.keys(weights) });

    const timeoutMs = clamp(this.opts.timeoutMs ?? 8000, 1000, 16000);
    const allowAutoStrip = flags.autoStripAdditionalProps ?? this.opts.autoStripAdditionalPropsDefault ?? false;

    // Attempt 1
    const res1 = await this.llm.complete({ prompt, timeoutMs, correlationId, attempt: 1 });
    this.debug('llm_response', { correlation_id: correlationId, attempt: 1, status: res1.status, text_bytes: Buffer.byteLength(res1.text || '') });
    if (res1.status === 'rate_limited') {
      if ((this.opts.maxRetries429 ?? 1) > 0) {
        await sleep(jitteredBackoff(1));
        const res2 = await this.llm.complete({ prompt, timeoutMs, correlationId, attempt: 2 });
        this.debug('llm_response', { correlation_id: correlationId, attempt: 2, status: res2.status, text_bytes: Buffer.byteLength(res2.text || '') });
        return await this.parseValidateOrRepair(res2.text, input, weights, correlationId, 2, prompt, allowAutoStrip);
      }
      throw new RefinementError('Provider rate limited', 'LLM_429', true, { statusCode: res1.statusCode });
    }
    if (res1.status === 'timeout') {
      throw new RefinementError('Provider timeout', 'LLM_TIMEOUT', true);
    }

    return await this.parseValidateOrRepair(res1.text, input, weights, correlationId, 1, prompt, allowAutoStrip);
  }

  private async parseValidateOrRepair(
    text: string,
    input: PromptRefinementInput,
    effectiveWeights: Record<string, number>,
    correlationId: string,
    attempt: number,
    basePrompt: string,
    allowAutoStrip: boolean
  ): Promise<RefinementResult> {
    this.debug('parse_start', { correlation_id: correlationId, attempt, text_bytes: Buffer.byteLength(text || '') });
    const parsed = tryParseJson(text);

    // Deep sanitize with additional-properties tracking
    const allowedRefined = ['version', 'id', 'refined_text', 'lenses', 'rationale'];
    const additionalPaths: string[] = [];

    const sanitizeRefined = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      // track unknown keys
      Object.keys(obj).forEach((k) => {
        if (!allowedRefined.includes(k)) additionalPaths.push(`/refinedPrompt/${k}`);
      });
      return Object.fromEntries(Object.entries(obj).filter(([k]) => allowedRefined.includes(k)));
    };

    const sanitizeStudyPlan = (sp: any, base: string = '/studyPlan'): any => {
      if (!sp || typeof sp !== 'object') return sp;
      const topAllowed = new Set(['version', 'id', 'overview', 'parts']);
      Object.keys(sp).forEach((k) => { if (!topAllowed.has(k)) additionalPaths.push(`${base}/${k}`); });
      const top: any = {};
      if (sp.version !== undefined) top.version = sp.version;
      if (sp.id !== undefined) top.id = sp.id;
      if (sp.overview !== undefined) top.overview = sp.overview;
      if (Array.isArray(sp.parts)) {
        top.parts = sp.parts.map((part: any, pi: number) => {
          const partAllowed = new Set(['title', 'chapters', 'meta']);
          if (part && typeof part === 'object') {
            Object.keys(part).forEach((k) => { if (!partAllowed.has(k)) additionalPaths.push(`${base}/parts/${pi}/${k}`); });
          }
          const p: any = {};
          if (typeof part?.title === 'string') p.title = part.title;
          if (Array.isArray(part?.chapters)) {
            p.chapters = part.chapters.map((ch: any, ci: number) => {
              const chapAllowed = new Set(['title', 'modules', 'cross_links', 'prereqs', 'flags']);
              if (ch && typeof ch === 'object') {
                Object.keys(ch).forEach((k) => { if (!chapAllowed.has(k)) additionalPaths.push(`${base}/parts/${pi}/chapters/${ci}/${k}`); });
              }
              const c: any = {};
              if (typeof ch?.title === 'string') c.title = ch.title;
              if (Array.isArray(ch?.modules)) {
                c.modules = ch.modules.map((m: any, mi: number) => {
                  const modAllowed = new Set(['title', 'outcomes', 'routing_suggestions']);
                  if (m && typeof m === 'object') {
                    Object.keys(m).forEach((k) => { if (!modAllowed.has(k)) additionalPaths.push(`${base}/parts/${pi}/chapters/${ci}/modules/${mi}/${k}`); });
                  }
                  const mod: any = {};
                  if (typeof m?.title === 'string') mod.title = m.title;
                  if (Array.isArray(m?.outcomes)) mod.outcomes = m.outcomes.filter((s: any) => typeof s === 'string');
                  if (Array.isArray(m?.routing_suggestions)) {
                    mod.routing_suggestions = m.routing_suggestions.map((rs: any, ri: number) => {
                      const rsAllowed = new Set(['topic', 'folder', 'tags', 'filename_slug']);
                      if (rs && typeof rs === 'object') {
                        Object.keys(rs).forEach((k) => { if (!rsAllowed.has(k)) additionalPaths.push(`${base}/parts/${pi}/chapters/${ci}/modules/${mi}/routing_suggestions/${ri}/${k}`); });
                      }
                      const item: any = {};
                      if (typeof rs?.topic === 'string') item.topic = rs.topic;
                      if (typeof rs?.folder === 'string') item.folder = rs.folder;
                      if (Array.isArray(rs?.tags)) item.tags = rs.tags.filter((s: any) => typeof s === 'string');
                      if (typeof rs?.filename_slug === 'string') item.filename_slug = rs.filename_slug;
                      return item;
                    });
                  }
                  return mod;
                });
              }
              if (Array.isArray(ch?.cross_links)) c.cross_links = ch.cross_links.filter((s: any) => typeof s === 'string');
              if (Array.isArray(ch?.prereqs)) c.prereqs = ch.prereqs.filter((s: any) => typeof s === 'string');
              if (ch?.flags && typeof ch.flags === 'object') {
                const flagsAllowed = new Set(['foundational']);
                Object.keys(ch.flags).forEach((k) => { if (!flagsAllowed.has(k)) additionalPaths.push(`${base}/parts/${pi}/chapters/${ci}/flags/${k}`); });
                const flags: any = {};
                if (typeof ch.flags.foundational === 'boolean') flags.foundational = ch.flags.foundational;
                c.flags = flags;
              }
              return c;
            });
          }
          if (part?.meta && typeof part.meta === 'object') {
            const metaAllowed = new Set(['reflection', 'synthesis']);
            Object.keys(part.meta).forEach((k) => { if (!metaAllowed.has(k)) additionalPaths.push(`${base}/parts/${pi}/meta/${k}`); });
            const meta: any = {};
            if (Array.isArray(part.meta.reflection)) meta.reflection = part.meta.reflection.filter((s: any) => typeof s === 'string');
            if (Array.isArray(part.meta.synthesis)) meta.synthesis = part.meta.synthesis.filter((s: any) => typeof s === 'string');
            p.meta = meta;
          }
          return p;
        });
      }
      return top;
    };

    const originalRefined = parsed?.refinedPrompt;
    const originalStudy = parsed?.studyPlan;
    let refinedPrompt = sanitizeRefined(originalRefined);
    let studyPlan = sanitizeStudyPlan(originalStudy);

    if (additionalPaths.length) {
      this.debug('additional_properties_detected', { correlation_id: correlationId, attempt, count: additionalPaths.length, paths: additionalPaths });
    }

    let valid = this.validators.validateRefinedPrompt(refinedPrompt) && this.validators.validateStudyPlan(studyPlan);
    this.debug('validation_checked', { correlation_id: correlationId, attempt, valid, refined_keys: Object.keys(refinedPrompt || {}), study_plan_keys: Object.keys(studyPlan || {}) });

    if (!valid && attempt < 2) {
      const errors = this.validators.errorsToPointers();
      this.debug('validation_errors', { correlation_id: correlationId, attempt, errors });
      const repairInstruction = this.composeRepairInstruction(errors, additionalPaths);
      const prompt = `${basePrompt}\n\nREPAIR_GUIDANCE: ${JSON.stringify(repairInstruction)}`;
      const res = await this.llm.complete({ prompt, timeoutMs: 8000, correlationId, attempt: attempt + 1 });
      this.debug('llm_response', { correlation_id: correlationId, attempt: attempt + 1, status: res.status, text_bytes: Buffer.byteLength(res.text || '') });
      const parsed2 = tryParseJson(res.text);
      additionalPaths.length = 0; // reset
      refinedPrompt = sanitizeRefined(parsed2?.refinedPrompt);
      studyPlan = sanitizeStudyPlan(parsed2?.studyPlan);
      if (additionalPaths.length) {
        this.debug('additional_properties_detected', { correlation_id: correlationId, attempt: attempt + 1, count: additionalPaths.length, paths: additionalPaths });
      }
      valid = this.validators.validateRefinedPrompt(refinedPrompt) && this.validators.validateStudyPlan(studyPlan);
      this.debug('validation_checked_after_repair', { correlation_id: correlationId, attempt: attempt + 1, valid });
      if (!valid) {
        if (allowAutoStrip) {
          // One last attempt: if sanitized objects validate now, accept them.
          const ok = this.validators.validateRefinedPrompt(refinedPrompt) && this.validators.validateStudyPlan(studyPlan);
          if (ok) {
            this.debug('auto_strip_applied', { correlation_id: correlationId, attempt: attempt + 1 });
            return {
              refinedPrompt: this.finalizeRefined(refinedPrompt!),
              studyPlan: this.finalizePlan(studyPlan!),
              attempts: attempt + 1
            };
          }
          this.debug('auto_strip_failed', { correlation_id: correlationId, errors: this.validators.errorsToPointers() });
        }
        const finalErrors = this.validators.errorsToPointers();
        this.debug('validation_failed_after_repair', { correlation_id: correlationId, errors: finalErrors });
        throw new RefinementError('Schema validation failed after repair', 'SCHEMA_INVALID', false, {
          errors: finalErrors
        });
      }
      const result = {
        refinedPrompt: this.finalizeRefined(refinedPrompt!),
        studyPlan: this.finalizePlan(studyPlan!),
        attempts: attempt + 1
      };
      this.debug('refine_success', { correlation_id: correlationId, attempts: result.attempts });
      return result;
    }

    if (!valid) {
      if (allowAutoStrip) {
        const ok = this.validators.validateRefinedPrompt(refinedPrompt) && this.validators.validateStudyPlan(studyPlan);
        if (ok) {
          this.debug('auto_strip_applied', { correlation_id: correlationId, attempt });
          return {
            refinedPrompt: this.finalizeRefined(refinedPrompt!),
            studyPlan: this.finalizePlan(studyPlan!),
            attempts: attempt
          };
        }
        this.debug('auto_strip_failed', { correlation_id: correlationId, errors: this.validators.errorsToPointers() });
      }
      this.debug('llm_malformed', { correlation_id: correlationId, sample: (text || '').slice(0, 200) });
      throw new RefinementError('LLM produced malformed output', 'LLM_MALFORMED', true, {
        sample: text.slice(0, 200)
      });
    }

    const result = {
      refinedPrompt: this.finalizeRefined(refinedPrompt!),
      studyPlan: this.finalizePlan(studyPlan!),
      attempts: attempt
    };
    this.debug('refine_success', { correlation_id: correlationId, attempts: result.attempts });
    return result;
  }

  private composePrompt(input: PromptRefinementInput): { prompt: string; weights: Record<string, number> } {
    const { templateVersion } = this.template;
    const weights = input.lensWeights && Object.keys(input.lensWeights).length > 0
      ? input.lensWeights
      : { tutor: 1 / 3, publisher: 1 / 3, student: 1 / 3 };

    const header = `SYSTEM_TEMPLATE: ${templateVersion}`;

    const { RefinedPromptV1Schema, StudyPlanV1Schema } = getRawSchemas() as any;
    const render = (schema: any, indent = '    '): string => {
      if (!schema || typeof schema !== 'object') return '';
      const lines: string[] = [];
      const type = schema.type;
      if (type === 'object' && schema.properties) {
        lines.push('{');
        const keys = Object.keys(schema.properties);
        for (const key of keys) {
          const prop = schema.properties[key];
          const t = prop?.type || (prop?.const !== undefined ? 'const' : Array.isArray(prop?.anyOf) ? 'anyOf' : 'any');
          if (t === 'object') {
            lines.push(`${indent}"${key}": object ${render(prop, indent + '  ')}`);
          } else if (t === 'array') {
            lines.push(`${indent}"${key}": array [ ${render(prop.items, indent + '  ')} ]`);
          } else if (prop?.const !== undefined) {
            lines.push(`${indent}"${key}": const ${JSON.stringify(prop.const)}`);
          } else if (prop?.pattern) {
            lines.push(`${indent}"${key}": ${t} (pattern ${prop.pattern})`);
          } else {
            lines.push(`${indent}"${key}": ${t}`);
          }
        }
        lines.push(indent.slice(0, -2) + '}');
        return lines.join('\n');
      }
      if (type === 'array' && schema.items) {
        return render(schema.items, indent + '  ');
      }
      return String(type || 'any');
    };

    const strictSpec = [
      'STRICT_OUTPUT_SPEC:',
      '- Return ONLY a JSON object with keys {"refinedPrompt","studyPlan"}.',
      '- No markdown fences, no commentary.',
      '- refinedPrompt (RefinedPromptV1):',
      render(RefinedPromptV1Schema, '    '),
      '- studyPlan (StudyPlanV1):',
      render(StudyPlanV1Schema, '    '),
      '- DO NOT include any additional properties beyond those listed above.',
      '- Field names and types must match exactly.',
      '- If unsure, return a minimal valid output with all required fields.'
    ].join('\n');

    const lines = [
      header,
      `GOAL: "${input.goal}"`,
      `CONTEXT_REFS: ${JSON.stringify(input.contextRefs || [])}`,
      `WEIGHTS: ${JSON.stringify(weights)}`,
      'RESPONSE_FORMAT: JSON with keys { refinedPrompt, studyPlan }',
      strictSpec
    ];
    const prompt = lines.join('\n');
    this.debug('prompt_ready', { prompt_bytes: Buffer.byteLength(prompt) });
    return { prompt, weights };
  }

  private composeRepairInstruction(errors: { path: string; message: string }[], additionalPaths?: string[]) {
    return {
      instruction: 'Your previous response did not validate. Return ONLY strict JSON that satisfies both schemas: RefinedPromptV1 and StudyPlanV1. Do not include code fences or commentary.' +
        (additionalPaths && additionalPaths.length ? ` Also remove these additional properties: ${additionalPaths.join(', ')}` : ''),
      errors,
      additional_properties_to_remove: additionalPaths || []
    };
  }

  private finalizeRefined(data: any): RefinedPromptV1 {
    const obj = {
      ...data,
      version: 1
    };
    if (!this.validators.validateRefinedPrompt(obj)) {
      this.debug('finalize_refined_invalid', { errors: this.validators.errorsToPointers() });
      throw new RefinementError('Finalization schema invalid (refined)', 'SCHEMA_INVALID', false, {
        errors: this.validators.errorsToPointers()
      });
    }
    return obj as RefinedPromptV1;
  }

  private finalizePlan(data: any): StudyPlanV1 {
    const obj = {
      ...data,
      version: 1
    };
    if (!this.validators.validateStudyPlan(obj)) {
      this.debug('finalize_plan_invalid', { errors: this.validators.errorsToPointers() });
      throw new RefinementError('Finalization schema invalid (study plan)', 'SCHEMA_INVALID', false, {
        errors: this.validators.errorsToPointers()
      });
    }
    return obj as StudyPlanV1;
  }

  computeInputsFingerprint(input: PromptRefinementInput & { weights?: Record<string, number> }): string {
    const { templateVersion } = this.template;
    const canonical = canonicalJson({
      goal: input.goal,
      contextRefs: input.contextRefs || [],
      weights: (input as any).lensWeights || (input as any).weights || {},
      templateVersion
    });
    const fp = crypto.createHash('sha256').update(canonical).digest('hex');
    this.debug('inputs_fingerprint', { fingerprint: fp });
    return fp;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function tryParseJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function jitteredBackoff(attempt: number) {
  const base = 300 * Math.pow(2, attempt);
  const jitter = Math.random() * 100;
  return base + jitter;
}

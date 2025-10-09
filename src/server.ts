import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
// Load env from .env.local if present; fallback to .env
(() => {
  try {
    const envLocal = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocal)) {
      dotenv.config({ path: envLocal });
    } else {
      dotenv.config();
    }
  } catch {
    // ignore
  }
})();

import express, { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { Histogram, Registry, collectDefaultMetrics, Gauge, Counter } from 'prom-client';
import crypto from 'crypto';

import { MockLLMAdapter } from './adapters/llm/MockLLMAdapter';
import { OpenAIAdapter } from './adapters/llm/OpenAIAdapter';
import { RefinementService, RefinementError } from './refinement/RefinementService';

const app = express();
app.use(express.json({ limit: '256kb' }));

// CORS for local UI (Next.js dev on 4000). Adjust origin as needed.
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (!origin || origin === 'http://localhost:4000') {
    res.header('Access-Control-Allow-Origin', 'http://localhost:4000');
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-Id');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Metrics
const registry = new Registry();
collectDefaultMetrics({ register: registry });
const refineLatency = new Histogram({
  name: 'refinement_latency_ms',
  help: 'Latency of refinement end-to-end',
  buckets: [50, 100, 200, 500, 1000, 2000, 4000, 8000, 16000],
  registers: [registry]
});
const refinedTextSize = new Gauge({ name: 'refined_text_size', help: 'Size of refinedText', registers: [registry] });
const planSizeChars = new Gauge({ name: 'plan_size_chars', help: 'Serialized StudyPlan size (chars)', registers: [registry] });
const attemptsCounter = new Counter({ name: 'refinement_attempts', help: 'Attempts per refinement', registers: [registry] });
const successCounter = new Counter({ name: 'refinement_success_total', help: 'Successful refinements', registers: [registry] });
const failureCounter = new Counter({ name: 'refinement_failure_total', help: 'Failed refinements', registers: [registry] });

// Correlation middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).correlationId = (req.headers['x-correlation-id'] as string) || randomId();
  next();
});

// Adapter selection (env-driven). Never log secrets.
const provider = (process.env.LLM_PROVIDER || '').toLowerCase();
let llmLabel = 'mock';
let llm;
if (provider === 'openai' || process.env.OPENAI_API_KEY) {
  try {
    llm = new OpenAIAdapter({
      apiKey: process.env.OPENAI_API_KEY as string,
      model: process.env.OPENAI_MODEL,
      baseURL: process.env.OPENAI_BASE_URL,
      temperature: process.env.OPENAI_TEMPERATURE ? Number(process.env.OPENAI_TEMPERATURE) : undefined
    });
    llmLabel = 'openai';
  } catch (e) {
    // Fallback to mock if misconfigured
    llm = new MockLLMAdapter();
    llmLabel = 'mock';
  }
} else {
  llm = new MockLLMAdapter();
}

logger.info({ provider: llmLabel }, 'LLM adapter configured');

const service = new RefinementService(llm, { timeoutMs: 8000, maxRetries429: 1, autoStripAdditionalPropsDefault: (process.env.REFINE_AUTO_STRIP_ADDITIONAL_PROPS || 'false').toLowerCase() === 'true' });

app.post('/refine', async (req: Request, res: Response) => {
  const start = Date.now();
  const correlationId = (req as any).correlationId as string;
  logger.info({ correlation_id: correlationId, action: 'refine_start' }, 'refine start');

  try {
    const autoStripParam = String((req.query.autoStripAdditionalProps ?? req.body?.options?.autoStripAdditionalProps ?? '')).toLowerCase();
    const autoStrip = autoStripParam === 'true' || autoStripParam === '1' || autoStripParam === 'yes';
    // Sanitize input to schema-allowed keys only to avoid additionalProperties errors
    const input = {
      goal: req.body?.goal,
      contextRefs: req.body?.contextRefs,
      // Schema expects 'weights' not 'lensWeights'
      weights: req.body?.lensWeights || req.body?.weights
    } as any;
    const result = await service.refine(input, correlationId, { autoStripAdditionalProps: autoStrip });
    const duration = Date.now() - start;
    refineLatency.observe(duration);
    attemptsCounter.inc(result.attempts);
    refinedTextSize.set(result.refinedPrompt.refined_text.length);
    planSizeChars.set(JSON.stringify(result.studyPlan).length);
    successCounter.inc();

    logger.info(
      {
        correlation_id: correlationId,
        action: 'refine_ok',
        attempts: result.attempts,
        duration_ms: duration
      },
      'refine ok'
    );

    res.status(200).json({ refinedPrompt: result.refinedPrompt, studyPlan: result.studyPlan });
  } catch (err) {
    const duration = Date.now() - start;
    refineLatency.observe(duration);
    failureCounter.inc();

    if (err instanceof RefinementError) {
      const status = err.code.startsWith('LLM_') ? 502 : 400;
      const detailed = buildDetailedErrors(err.details);
      if ((process.env.LOG_LEVEL || '').toLowerCase() === 'debug') {
        logger.debug({ correlation_id: correlationId, code: err.code, detailed }, 'refine failed (detailed)');
      }
      logger.warn(
        { correlation_id: correlationId, code: err.code, retryable: err.retryable, details: redact(err.details), duration_ms: duration },
        err.message
      );
      res.status(status).json({
        code: err.code,
        message: err.message,
        retryable: err.retryable,
        details: err.details,
        invalid_fields: detailed.invalid_fields,
        hint: detailed.hint
      });
      return;
    }

    logger.error({ correlation_id: correlationId, err }, 'unexpected error');
    res.status(500).json({ code: 'INTERNAL', message: 'Unexpected error' });
  }
});

// Minimal Proposal endpoint to unblock UI integration
app.post('/proposal', async (req: Request, res: Response) => {
  try {
    const { prompt, refined_text } = req.body || {};
    const text: string | undefined = refined_text || prompt;
    if (!text || typeof text !== 'string' || text.trim().length < 8) {
      return res.status(400).json({ code: 'SCHEMA_INVALID', message: 'prompt/refined_text must be a string with minLength 8' });
    }
    const canonical = text.trim();
    const hash = crypto.createHash('sha256').update(canonical).digest('hex');
    const id = `proposal-${randomId()}`;
    const proposal = {
      version: 1 as const,
      id,
      origin: 'prompt' as const,
      target: { route_id: 'unknown', path: 'drafts/temp.md' },
      frontmatter: { title: 'Draft', status: 'draft', tags: [], aliases: [] },
      body: { content_md: canonical },
      governance: { related_links: [], rationale: 'Auto-generated preview' },
      hash
    };
    return res.status(200).json({ proposal });
  } catch (err) {
    return res.status(500).json({ code: 'INTERNAL', message: 'Unexpected error' });
  }
});

app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));
app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

const port = Number(process.env.PORT || 3030);
app.listen(port, () => {
  logger.info({ port }, 'KMV Refinement Service listening');
});

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function redact(details: unknown) {
  // Future: scrub sensitive paths if any
  return details;
}

function buildDetailedErrors(details: unknown): { invalid_fields: Array<{ path: string; message: string; description: string }>; hint: string } {
  const invalid_fields: Array<{ path: string; message: string; description: string }> = [];
  const errs = (details as any)?.errors as Array<{ path: string; message: string }> | undefined;
  if (Array.isArray(errs)) {
    for (const e of errs) {
      const path = e.path || '';
      const msg = e.message || '';
      let description = 'Invalid field';
      // Heuristics to enrich descriptions
      if (/required property '([^']+)'/.test(msg)) {
        const m = msg.match(/required property '([^']+)'/);
        const field = m ? m[1] : 'field';
        description = `Missing required field "${field}" at ${path}.`;
      } else if (msg.includes('must be equal to constant')) {
        description = `Field at ${path} must equal the required constant (e.g., version=1).`;
      } else if (/must match pattern/.test(msg)) {
        description = `Field at ${path} must match the required pattern.`;
      } else if (msg.includes('must be object')) {
        description = `Field at ${path} must be an object.`;
      } else if (msg.includes('must NOT have additional properties')) {
        description = `Object at ${path} contains additional properties. Remove any fields not declared in the schema.`;
      }
      invalid_fields.push({ path, message: msg, description });
    }
  }
  const hint = invalid_fields.length
    ? 'Review invalid_fields for exact paths and fix missing/extra fields. Ensure version=1 and IDs match patterns.'
    : '';
  return { invalid_fields, hint };
}

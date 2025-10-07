import fs from 'fs';
import path from 'path';

import Ajv, { DefinedError, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

import PromptRefinementInputSchema from '../contracts/PromptRefinementInput.schema.json';
import RefinedPromptV1Schema from '../contracts/RefinedPromptV1.schema.json';
import StudyPlanV1Schema from '../contracts/StudyPlanV1.schema.json';

// TypeScript interfaces aligned with schemas (compile-time helpers)
export interface PromptRefinementInput {
  goal: string;
  contextRefs?: string[];
  lensWeights?: Record<string, number>;
}

export interface RefinedPromptV1 {
  version: 1;
  id: string;
  refined_text: string;
  rationale: string;
  lenses: {
    tutor: number;
    publisher: number;
    student: number;
  };
  constraints: string[];
}

export interface StudyPlanV1 {
  version: 1;
  id: string;
  overview: string;
  parts: Array<{
    title: string;
    chapters: Array<{
      title: string;
      modules: Array<{
        title: string;
        outcomes: string[];
        routing_suggestions: Array<{
          topic: string;
          folder: string;
          filename_slug: string;
          tags?: string[];
        }>;
      }>;
    }>;
    meta: {
      reflection?: string[];
      synthesis?: string[];
    };
  }>;
}

export class SchemaValidators {
  readonly ajv: Ajv;
  private _vInput: ValidateFunction<PromptRefinementInput>;
  private _vRefined: ValidateFunction<RefinedPromptV1>;
  private _vPlan: ValidateFunction<StudyPlanV1>;

  constructor() {
    this.ajv = new Ajv({
      strict: true,
      allErrors: true,
      allowUnionTypes: false,
      removeAdditional: false,
      useDefaults: false,
      coerceTypes: false
    });
    addFormats(this.ajv);

    this._vInput = this.ajv.compile<PromptRefinementInput>(PromptRefinementInputSchema);
    this._vRefined = this.ajv.compile<RefinedPromptV1>(RefinedPromptV1Schema);
    this._vPlan = this.ajv.compile<StudyPlanV1>(StudyPlanV1Schema);
  }

  validatePromptRefinementInput(data: unknown): data is PromptRefinementInput {
    const ok = this._vInput(data);
    return !!ok;
  }

  validateRefinedPrompt(data: unknown): data is RefinedPromptV1 {
    const ok = this._vRefined(data as any);
    return !!ok;
  }

  validateStudyPlan(data: unknown): data is StudyPlanV1 {
    const ok = this._vPlan(data as any);
    return !!ok;
  }

  errorsToPointers(): { path: string; message: string }[] {
    // Prefer most recent validator errors, fallback to global Ajv errors
    const errors = this._vInput.errors || this._vRefined.errors || this._vPlan.errors || this.ajv.errors;
    if (!errors) return [];
    return errors.map((e) => ({ path: e.instancePath || e.schemaPath || '', message: e.message || '' }));
  }
}

export function canonicalJson(val: unknown): string {
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    const sortedKeys = Object.keys(val as Record<string, unknown>).sort();
    const out: Record<string, unknown> = {};
    for (const k of sortedKeys) out[k] = (val as any)[k];
    return JSON.stringify(out);
  }
  return JSON.stringify(val);
}

export function loadTemplateVersioned(): { templateVersion: string; template: string } {
  const templatePath = path.resolve(
    process.cwd(),
    'design/prompts/curriculum-architect-template.md'
  );
  const template = fs.readFileSync(templatePath, 'utf8');
  return { templateVersion: 'curriculum-architect-v1', template };
}

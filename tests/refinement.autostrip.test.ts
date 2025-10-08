import { describe, it, expect } from 'vitest';
import type { LLMAdapter, LLMAdapterResponse, LLMCompletionParams } from '../src/adapters/llm/LLMAdapter';
import { RefinementService } from '../src/refinement/RefinementService';
import { SchemaValidators } from '../src/schemas';

class ExtraPropsLLM implements LLMAdapter {
  // Always returns extra fields that violate schemas
  async complete(params: LLMCompletionParams): Promise<LLMAdapterResponse> {
    const refined = {
      version: 1,
      id: 'abcd-efgh',
      refined_text: 'text',
      lenses: { tutor: 0.4, publisher: 0.3, student: 0.3 },
      rationale: 'why',
      goal: 'should-not-be-here' // extra
    };
    const study = {
      version: 1,
      id: 'ijkl-mnop',
      overview: 'plan',
      parts: [
        {
          title: 'p1',
          extra: 'nope', // extra at part level
          chapters: [
            {
              title: 'c1',
              unknown: true, // extra at chapter level
              modules: [
                {
                  title: 'm1',
                  foo: 'bar', // extra at module level
                  outcomes: ['o1'],
                  routing_suggestions: [
                    { topic: 't', folder: 'f', filename_slug: 'slug', extra_tag: 'x' } // extra at rs level
                  ]
                }
              ]
            }
          ],
          meta: { reflection: ['r1'], synthesis: ['s1'], nope: 'x' } // extra at meta level
        }
      ]
    };
    const text = JSON.stringify({ refinedPrompt: refined as any, studyPlan: study as any });
    return { text, provider: 'fake', status: 'ok', latencyMs: 1 };
  }
}

describe('RefinementService autoStripAdditionalProps', () => {
  it('sanitizes extras and succeeds even when autoStrip disabled (pre-validation strip)', async () => {
    const validators = new SchemaValidators();
    const service = new RefinementService(new ExtraPropsLLM(), { timeoutMs: 8000, maxRetries429: 0, autoStripAdditionalPropsDefault: false });
    const { refinedPrompt, studyPlan } = await service.refine({ goal: 'goal long enough' } as any, 'corr');
    expect(validators.validateRefinedPrompt(refinedPrompt)).toBe(true);
    expect(validators.validateStudyPlan(studyPlan)).toBe(true);
  });

  it('sanitizes extras and succeeds when autoStrip enabled (flag)', async () => {
    const validators = new SchemaValidators();
    const service = new RefinementService(new ExtraPropsLLM(), { timeoutMs: 8000, maxRetries429: 0, autoStripAdditionalPropsDefault: false });
    const { refinedPrompt, studyPlan } = await service.refine({ goal: 'goal long enough' } as any, 'corr', { autoStripAdditionalProps: true });
    expect(validators.validateRefinedPrompt(refinedPrompt)).toBe(true);
    expect(validators.validateStudyPlan(studyPlan)).toBe(true);
    expect((refinedPrompt as any).goal).toBeUndefined();
    expect((studyPlan as any).parts[0].extra).toBeUndefined();
  });
});

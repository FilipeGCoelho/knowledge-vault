import { describe, it, expect } from 'vitest';
import type { LLMAdapter, LLMAdapterResponse, LLMCompletionParams } from '../src/adapters/llm/LLMAdapter';
import { RefinementService } from '../src/refinement/RefinementService';
import { SchemaValidators } from '../src/schemas';

class FixOnSecondAttemptLLM implements LLMAdapter {
  async complete(params: LLMCompletionParams): Promise<LLMAdapterResponse> {
    if (params.attempt === 1) {
      const text = JSON.stringify({ refinedPrompt: { id: 'bad' }, studyPlan: { id: 'bad' } });
      return { text, provider: 'fake', status: 'ok', latencyMs: 1 };
    }
    // Valid payload matching schema
    const good = {
      refinedPrompt: {
        version: 1,
        id: 'mockid1234',
        refined_text: 'Refined',
        lenses: { tutor: 0.34, publisher: 0.33, student: 0.33 },
        rationale: 'Because',
        constraints: []
      },
      studyPlan: {
        version: 1,
        id: 'mockid1234',
        overview: 'Overview',
        parts: [
          {
            title: 'Part 1',
            chapters: [
              {
                title: 'Chapter 1',
                modules: [
                  { title: 'Module 1', outcomes: ['Outcome 1'], routing_suggestions: [{ topic: 't', folder: 'f', filename_slug: 'slug' }] }
                ]
              }
            ],
            meta: { reflection: [], synthesis: [] }
          }
        ]
      }
    };
    return { text: JSON.stringify(good), provider: 'fake', status: 'ok', latencyMs: 1 };
  }
}

describe('RefinementService repair loop', () => {
  it('repairs on second attempt and returns valid outputs', async () => {
    const validators = new SchemaValidators();
    const service = new RefinementService(new FixOnSecondAttemptLLM(), { timeoutMs: 8000, maxRetries429: 0 });
    const { refinedPrompt, studyPlan, attempts } = await service.refine({ goal: 'long enough goal' } as any, 'corr');
    expect(attempts).toBe(2);
    expect(validators.validateRefinedPrompt(refinedPrompt)).toBe(true);
    expect(validators.validateStudyPlan(studyPlan)).toBe(true);
  });
});

class RateLimitThenOk implements LLMAdapter {
  private called = 0;
  async complete(params: LLMCompletionParams): Promise<LLMAdapterResponse> {
    this.called++;
    if (this.called === 1) return { text: '', provider: 'fake', status: 'rate_limited', latencyMs: 1, statusCode: 429 } as any;
    const ok = {
      refinedPrompt: {
        version: 1,
        id: 'mockid1234',
        refined_text: 'text',
        lenses: { tutor: 0.3, publisher: 0.3, student: 0.4 },
        rationale: 'r'
      },
      studyPlan: {
        version: 1,
        id: 'mockid1234',
        overview: 'o',
        parts: [
          { title: 'p', chapters: [{ title: 'c', modules: [{ title: 'm', outcomes: ['o'] }] }], meta: {} }
        ]
      }
    };
    return { text: JSON.stringify(ok), provider: 'fake', status: 'ok', latencyMs: 1 };
  }
}

describe('RefinementService provider edge cases', () => {
  it('retries once on 429 and succeeds', async () => {
    const service = new RefinementService(new RateLimitThenOk(), { timeoutMs: 8000, maxRetries429: 1 });
    const out = await service.refine({ goal: 'long enough' } as any, 'corr');
    expect(out.attempts).toBe(2);
  });
});

import { describe, it, expect } from 'vitest';

import { MockLLMAdapter } from '../src/adapters/llm/MockLLMAdapter';
import { RefinementService } from '../src/refinement/RefinementService';
import { SchemaValidators } from '../src/schemas';

describe('RefinementService - unit', () => {
  const service = new RefinementService(new MockLLMAdapter(), { timeoutMs: 8000, maxRetries429: 1 });

  it('normalizes input: trims, dedups, clamps weights', () => {
    const normalized = service.normalizeInput({
      goal: '   Learn REST   API   ',
      contextRefs: ['  a ', 'a', '', 'b'],
      lensWeights: { tutor: 1.2, publisher: -0.2, student: 0.5 }
    } as any);

    expect((normalized as any).goal).toBe('Learn REST API');
    expect((normalized as any).contextRefs).toEqual(['a', 'b']);
    expect((normalized as any).lensWeights).toEqual({ tutor: 1, publisher: 0, student: 0.5 });
  });

  it('produces valid outputs against schemas on happy path', async () => {
    const validators = new SchemaValidators();
    const { refinedPrompt, studyPlan } = await service.refine(
      {
        goal: 'Learn REST API design fundamentals',
        contextRefs: ['https://example.com']
      },
      'corr-1'
    );

    expect(validators.validateRefinedPrompt(refinedPrompt)).toBe(true);
    expect(validators.validateStudyPlan(studyPlan)).toBe(true);
  });
});

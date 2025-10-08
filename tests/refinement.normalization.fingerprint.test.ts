import { describe, it, expect } from 'vitest';
import { RefinementService } from '../src/refinement/RefinementService';
import { MockLLMAdapter } from '../src/adapters/llm/MockLLMAdapter';

describe('Normalization and fingerprint', () => {
  it('accepts weights alias and caps contextRefs to 8', () => {
    const svc = new RefinementService(new MockLLMAdapter(), {});
    const input: any = {
      goal: '   some goal long enough   ',
      contextRefs: Array.from({ length: 12 }, (_, i) => `u${i}`),
      weights: { tutor: 1.2, publisher: -0.2, student: 0.5 }
    };
    const norm: any = svc.normalizeInput(input);
    expect(norm.contextRefs?.length).toBe(8);
    expect(norm.lensWeights).toEqual({ tutor: 1, publisher: 0, student: 0.5 });
  });

  it('computeInputsFingerprint is deterministic for same inputs', () => {
    const svc = new RefinementService(new MockLLMAdapter(), {});
    const a = svc.computeInputsFingerprint({ goal: 'goal', contextRefs: ['a'], lensWeights: { tutor: 0.3, publisher: 0.3, student: 0.4 } } as any);
    const b = svc.computeInputsFingerprint({ goal: 'goal', contextRefs: ['a'], lensWeights: { tutor: 0.3, publisher: 0.3, student: 0.4 } } as any);
    expect(a).toBe(b);
  });

  it('computeInputsFingerprint changes when inputs change', () => {
    const svc = new RefinementService(new MockLLMAdapter(), {});
    const a = svc.computeInputsFingerprint({ goal: 'goal A' } as any);
    const b = svc.computeInputsFingerprint({ goal: 'goal B' } as any);
    expect(a).not.toBe(b);
  });
});

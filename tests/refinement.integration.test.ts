import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { Request, Response } from 'express';

import { RefinementService } from '../src/refinement/RefinementService';
import { MockLLMAdapter } from '../src/adapters/llm/MockLLMAdapter';
import { SchemaValidators } from '../src/schemas';

// Build a lightweight app instance for testing
function buildApp() {
  const app = express();
  app.use(express.json());
  const service = new RefinementService(new MockLLMAdapter(), { timeoutMs: 8000, maxRetries429: 1 });
  const validators = new SchemaValidators();
  app.post('/refine', async (req: Request, res: Response) => {
    if (!validators.validatePromptRefinementInput(req.body)) {
      res.status(400).json({ error: 'Invalid input', code: 'SCHEMA_INVALID', details: validators.errorsToPointers() });
      return;
    }
    try {
      const result = await service.refine(req.body, 'test-corr');
      res.status(200).json({ refinedPrompt: result.refinedPrompt, studyPlan: result.studyPlan });
    } catch (e: any) {
      res.status(400).json({ error: e.message, code: e.code });
    }
  });
  return app;
}

describe('POST /refine (integration)', () => {
  it('returns 200 and valid payloads', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/refine')
      .send({ goal: 'Learn REST API design fundamentals', contextRefs: ['https://example.com'] })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.refinedPrompt?.version).toBe(1);
    expect(res.body.studyPlan?.version).toBe(1);
  });

  it('returns 400 on goal too short (violates schema)', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/refine')
      .send({ goal: 'short' }) // 5 chars, should fail if schema minLength is 8
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SCHEMA_INVALID');
    expect(res.body.details).toBeTruthy();
  });

  it('returns 400 on empty goal', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/refine')
      .send({ goal: '' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SCHEMA_INVALID');
    expect(res.body.details).toBeTruthy();
  });

  it('returns 200 on boundary value (minLength=8)', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/refine')
      .send({ goal: '12345678' }) // exactly 8 chars
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.refinedPrompt?.version).toBe(1);
    expect(res.body.studyPlan?.version).toBe(1);
  });
});

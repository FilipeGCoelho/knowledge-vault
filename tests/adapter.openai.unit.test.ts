import { describe, it, expect, beforeEach } from 'vitest';
import { OpenAIAdapter } from '../src/adapters/llm/OpenAIAdapter';

// @ts-ignore - test override of private field
function setClient(adapter: any, fake: any) { (adapter as any).client = fake; }

describe('OpenAIAdapter request payload', () => {
  const adapter = new OpenAIAdapter({ apiKey: 'test-key', model: 'gpt-4o-mini', baseURL: 'http://localhost' });

  it('does not pass unsupported properties and includes response_format', async () => {
    let captured: any;
    const fake = {
      chat: {
        completions: {
          create: async (payload: any) => {
            captured = payload;
            return { choices: [{ message: { content: '{"refinedPrompt":{},"studyPlan":{}}' } }] };
          }
        }
      }
    };
    setClient(adapter as any, fake);
    const res = await adapter.complete({ prompt: 'x', timeoutMs: 1000, correlationId: 'corr', attempt: 1 } as any);
    expect(res.status).toBe('ok');
    expect(captured).toBeTruthy();
    expect(captured.response_format).toBeTruthy();
    expect((captured as any).signal).toBeUndefined();
    expect(Array.isArray(captured.messages)).toBe(true);
    expect(captured.messages[0].role).toBe('system');
    expect(captured.messages[1].role).toBe('user');
  });
});

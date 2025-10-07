import { LLMAdapter, LLMAdapterResponse, LLMCompletionParams } from './LLMAdapter';

function appendLLMDebugLog(entry: Record<string, unknown>) {
  if ((process.env.LOG_LEVEL || '').toLowerCase() !== 'debug') return;
  try {
    const fs = require('fs');
    const path = require('path');
    const dir = path.resolve(process.cwd(), 'logs/llm');
    fs.mkdirSync(dir, { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    const file = path.join(dir, `mock-${day}.jsonl`);
    fs.appendFileSync(file, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n');
  } catch {
    // ignore logging errors
  }
}

// Mock adapter that echoes a deterministic JSON payload based on the prompt
export class MockLLMAdapter implements LLMAdapter {
  async complete(params: LLMCompletionParams): Promise<LLMAdapterResponse> {
    const start = Date.now();
    appendLLMDebugLog({ event: 'llm_request', provider: 'mock', correlation_id: params.correlationId, attempt: params.attempt, prompt: params.prompt });
    // Produce valid RefinedPromptV1 and StudyPlanV1 per latest schemas
    const goal = extractGoal(params.prompt) ?? 'Unknown goal';
    const id = 'mockid1234';
    const refinedPrompt = {
      version: 1,
      id,
      refined_text: `Refined prompt for: ${goal}`,
      rationale: 'Mock rationale for refinement.',
      lenses: extractWeights(params.prompt) ?? { tutor: 0.34, publisher: 0.33, student: 0.33 },
      constraints: ['Output must be modular and indexed.']
    };

    const studyPlan = {
      version: 1,
      id,
      overview: `Study plan for: ${goal}`,
      parts: [
        {
          title: 'Part 1: Foundations',
          chapters: [
            {
              title: 'Chapter 1: Basics',
              modules: [
                {
                  title: 'Module 1: Introduction',
                  outcomes: ['Understand basics'],
                  routing_suggestions: [
                    {
                      topic: 'foundations',
                      folder: 'intro',
                      filename_slug: 'module-1-intro',
                      tags: ['mock']
                    }
                  ]
                }
              ]
            }
          ],
          meta: {
            reflection: ['Reflect on learning goals'],
            synthesis: ['Synthesize foundational concepts']
          }
        }
      ]
    };

    const response = {
      refinedPrompt,
      studyPlan
    };

    const text = JSON.stringify(response);
    const latency = Date.now() - start;
    appendLLMDebugLog({ event: 'llm_response', provider: 'mock', correlation_id: params.correlationId, attempt: params.attempt, latency_ms: latency, text_bytes: Buffer.byteLength(text), content: text });
    return {
      text,
      provider: 'mock',
      status: 'ok',
      latencyMs: latency
    } satisfies LLMAdapterResponse;
  }
}

function extractGoal(prompt: string): string | undefined {
  const m = prompt.match(/GOAL:\\s*\"([^\"]+)\"/);
  return m?.[1];
}

function extractWeights(prompt: string): Record<string, number> | undefined {
  const m = prompt.match(/WEIGHTS:\\s*(\{.*\})/s);
  if (!m) return undefined;
  try {
    return JSON.parse(m[1]);
  } catch {
    return undefined;
  }
}

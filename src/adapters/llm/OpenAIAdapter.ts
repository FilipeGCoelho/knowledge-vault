import OpenAI from 'openai';

import { LLMAdapter, LLMAdapterResponse, LLMCompletionParams } from './LLMAdapter';

export interface OpenAIAdapterOptions {
  apiKey: string;
  model?: string;
  baseURL?: string; // support proxies/Azure-compatible endpoints
  temperature?: number;
}

function appendLLMDebugLog(entry: Record<string, unknown>) {
  if ((process.env.LOG_LEVEL || '').toLowerCase() !== 'debug') return;
  try {
    const fs = require('fs');
    const path = require('path');
    const dir = path.resolve(process.cwd(), 'logs/llm');
    fs.mkdirSync(dir, { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    const file = path.join(dir, `openai-${day}.jsonl`);
    fs.appendFileSync(file, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n');
  } catch {
    // swallow logging errors
  }
}

export class OpenAIAdapter implements LLMAdapter {
  private client: OpenAI;
  private model: string;
  private temperature: number;

  constructor(opts: OpenAIAdapterOptions) {
    if (!opts.apiKey) throw new Error('OPENAI_API_KEY missing');
    this.client = new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL });
    this.model = opts.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.temperature = opts.temperature ?? Number(process.env.OPENAI_TEMPERATURE ?? 0.2);
  }

  async complete(params: LLMCompletionParams): Promise<LLMAdapterResponse> {
    const start = Date.now();

    // Use AbortController for per-call timeout control
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), Math.max(1000, params.timeoutMs));

    const fs = require('fs');
    const path = require('path');
    // Try multiple candidate paths so this works in dev (tsx) and built (dist)
    const candidates = [
      path.resolve(process.cwd(), 'design/prompts/refinement-llm-system-prompt.md'),
      path.resolve(__dirname, '../../../design/prompts/refinement-llm-system-prompt.md'),
      path.resolve(__dirname, '../../../../design/prompts/refinement-llm-system-prompt.md')
    ];
    let systemPrompt = '';
    let promptPath: string | undefined;
    for (const p of candidates) {
      if (fs.existsSync(p)) { promptPath = p; break; }
    }
    try {
      systemPrompt = promptPath ? fs.readFileSync(promptPath, 'utf8').trim() : '';
    } catch (e) {
      systemPrompt = '';
    }
    if (!systemPrompt) {
      systemPrompt = 'You are a strict JSON generator for a Prompt Refinement Service.';
    }

    try {
      // Minimal schema to enforce top-level object with the right keys
      const schema = {
        type: 'object',
        additionalProperties: false,
        required: ['refinedPrompt', 'studyPlan'],
        properties: {
          refinedPrompt: { type: 'object' },
          studyPlan: { type: 'object' }
        }
      } as const;

      // OpenAI SDK does NOT support AbortController's signal option. Do NOT pass 'signal' to SDK calls.
      // If you need to enforce timeouts, use Promise.race or similar logic outside the SDK call.
      // See: https://github.com/openai/openai-node/issues/193
      // Only include supported properties in the OpenAI SDK payload.
      // Defensive: never spread or pass extra fields from params or other sources.
      const payload = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: params.prompt
          }
        ],
        temperature: this.temperature,
        response_format: { type: 'json_schema', json_schema: { name: 'RefinementPair', schema } }
      };
      appendLLMDebugLog({ event: 'llm_request', provider: 'openai', model: this.model, correlation_id: params.correlationId, attempt: params.attempt, messages: payload.messages });
      let res;
      try {
        res = await (this.client.chat.completions.create as any)(payload);
      } catch (err: any) {
        appendLLMDebugLog({ event: 'llm_error', provider: 'openai', model: this.model, correlation_id: params.correlationId, attempt: params.attempt, error: String(err?.message || err) });
        // Detect and handle 'Unrecognized request argument supplied: signal' error
        if (err?.message?.startsWith('Unrecognized request argument supplied')) {
          // Log and return actionable error
          console.error({
            code: 'OPENAI_BAD_REQUEST',
            error: err,
            guidance: 'Remove all unsupported request arguments (e.g., signal) from OpenAI SDK calls.'
          }, 'OpenAI SDK received unsupported argument');
          clearTimeout(t);
          return { text: '', provider: 'openai', model: this.model, status: 'error', statusCode: 400 };
        }
        throw err;
      }

      const latency = Date.now() - start;
      clearTimeout(t);

      const choice = res.choices?.[0];
      const content = choice?.message?.content ?? '';
      appendLLMDebugLog({ event: 'llm_response', provider: 'openai', model: this.model, correlation_id: params.correlationId, attempt: params.attempt, latency_ms: latency, text_bytes: typeof content === 'string' ? Buffer.byteLength(content) : String(content).length, content });

      return {
        text: typeof content === 'string' ? content : String(content),
        provider: 'openai',
        model: this.model,
        status: 'ok',
        latencyMs: latency
      } satisfies LLMAdapterResponse;
    } catch (err: any) {
      clearTimeout(t);
      // Map common provider errors
      if (err?.name === 'AbortError') {
        return { text: '', provider: 'openai', model: this.model, status: 'timeout' };
      }
      const statusCode = Number(err?.status || err?.statusCode || err?.response?.status);
      if (statusCode === 429) {
        return { text: '', provider: 'openai', model: this.model, status: 'rate_limited', statusCode };
      }
      return { text: '', provider: 'openai', model: this.model, status: 'error', statusCode };
    }
  }
}

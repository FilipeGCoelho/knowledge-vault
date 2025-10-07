export interface LLMCompletionParams {
  prompt: string;
  timeoutMs: number;
  correlationId: string;
  attempt: number;
}

export interface LLMAdapterResponse {
  text: string; // raw model text response
  provider: string;
  model?: string;
  status: 'ok' | 'rate_limited' | 'timeout' | 'error';
  statusCode?: number;
  latencyMs?: number;
}

export interface LLMAdapter {
  complete(params: LLMCompletionParams): Promise<LLMAdapterResponse>;
}

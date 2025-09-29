# LLM Adapter

Purpose & Responsibilities

Abstract calls to LLM providers with timeouts, retries, and format-repair support for strict-schema outputs.

Interfaces

- Method: complete(prompt, opts) → provider response
- Options: timeout, retry/backoff, model/version.

Failure Modes & Error Codes

- LLM_TIMEOUT, LLM_429, LLM_MALFORMED; provider_code passthrough where safe.

Observability

- Metrics: latency_ms, retry_count, provider_code distribution.
- Logs: correlation_id, model, attempt, outcome (redacted content).

Security Considerations

- Secrets in memory only; no logging of payloads; redact tokens.

Acceptance Criteria

- Respects time budgets; repair loop limited to ≤ 2 attempts; pluggable provider.

Test Plan

- Unit: retry/backoff; timeout; error mapping.
- Integration: mock provider; schema-conforming outputs.

Ready-to-Implement Checklist

- [ ] Provider interface defined.
- [ ] Mock provider available for tests.
- [ ] Backoff parameters tuned.
- [ ] Redaction rules in place.

---

## End-to-end Information Flow (complete)

1. Build request
   - Compose system + user messages; include strict output spec when consumer requires schema adherence.

2. Execute with controls
   - Apply timeout; on 429, exponential backoff with jitter up to a capped attempt count.

3. Parse response
   - Return raw text or parsed JSON per consumer need; never log sensitive data.

4. Repair support (optional)
   - If consumer requests schema-conforming JSON and parse fails, return a structured error that the consumer can use to construct a repair prompt.

## Deterministic Algorithm (Step-by-step)

- Backoff
  - `base=250ms`, `factor=2`, `jitter=±20%`, `maxAttempts=2` (configurable).
- Timeouts
  - Default 8 s (p50), 16 s (p90) budget alignment.

## Examples

```ts
const res = await llm.complete({ system: sys, user: text }, { model: "gemini-2.5-pro", timeoutMs: 8000 })
if (!isJson(res)) throw { code: "LLM_MALFORMED" }
```

## Observability (expanded)

- Metrics: `llm_latency_ms`, `llm_retry_total`, `llm_429_total`
- Logs: `model, attempt, provider_code`

## Test Plan (expanded)

- Simulate 429 and ensure backoff timings; simulate timeout; malformed outputs.

## Edge Cases & Decisions

- Provider-specific quirks handled in adapter; do not leak to services.

## Traceability

| Requirement Ref | Section in This Doc | Test/Fixture |
| --- | --- | --- |
| Provider abstraction (requirements.md §3.2 F6) | Backoff/Timeout/Repair | mock provider tests |

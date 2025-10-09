# UI Security

CSP

- Disallow inline scripts/styles; use hashes or nonces if needed.
- Restrict connect-src to local API domain in dev.

Secrets Handling

- UI never loads provider secrets; API reads `OPENAI_API_KEY` from `.env.local`.
- Redact any sensitive values in logs; never render API keys.

CSRF

- Same-site cookies for mutations; include CSRF token header on POST if cookies are used.

Privacy

- No PII in telemetry; events are non-PII.
- Avoid third-party beacons; opt-in only when needed.

Last Updated: 2025-10-09

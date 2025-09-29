# Crypto/KeyStore Adapter

Purpose & Responsibilities

Provide Argon2id-based key derivation and AES-256-GCM encryption/decryption utilities; manage nonces/tags and metadata.

Interfaces

- Methods: deriveKey(passphrase, params), encrypt(plaintext, key), decrypt(ciphertext, key)
- Metadata: store nonce and auth tag with ciphertext.

Failure Modes & Error Codes

- KDF_PARAMS_INVALID, DECRYPT_AUTH_FAIL, RNG_ERROR.

Observability

- Metrics: encryption_version, kdf_time_ms.
- Logs: no secrets; parameter summaries only.

Security Considerations

- Strong defaults for Argon2id (m, t, p); random nonce; secure RNG; zeroize sensitive buffers where possible.

Acceptance Criteria

- Round-trip correctness; auth tag verification; rotation flow supported.

Test Plan

- Unit: derive/encrypt/decrypt; tamper detection; rotation re-encrypt.

Ready-to-Implement Checklist

- [ ] Parameter defaults documented.
- [ ] RNG source validated.
- [ ] Error mapping defined.
- [ ] Tests/fixtures ready.

---

## Deterministic Algorithm (Step-by-step)

- KDF
  - Argon2id with salt; test vectors for parameter set; constant-time compare for tags.
- AEAD
  - AES-256-GCM with 96-bit nonce; store `{nonce, tag, ciphertext}` in base64.

## Examples (encryption metadata)

```json
{
  "nonce": "base64...",
  "tag": "base64...",
  "ciphertext": "base64..."
}
```

## Test Plan (expanded)

- Tamper with tag or nonce → `DECRYPT_AUTH_FAIL`.
- KDF parameter edge cases → `KDF_PARAMS_INVALID`.

## Traceability

| Requirement Ref | Section in This Doc | Test/Fixture |
| --- | --- | --- |
| Security (system-design §7) | KDF/AEAD, Rotation | unit fixtures |

# <Component Name>

Purpose & Responsibilities

Briefly describe what this component does and why it exists. List key responsibilities and explicit non-responsibilities.

Inputs / Outputs (Contracts)

- Inputs: schemas, messages, files. Reference contract files by path and `$id`.
- Outputs: schemas, messages, files. State hashing/idempotency rules if any.

Interfaces

- Public API (HTTP, RPC, CLI) including methods, paths, and auth expectations.
- Internal interfaces to adapters/services.

Failure Modes & Error Codes

- Enumerate expected error codes and their classes. Include retry guidance and user remediation mapping.

Observability

- Metrics to emit and units.
- Structured logs with required fields.

Security Considerations

- Secrets handling, permissions, and data-at-rest rules.
- Validation and anti-abuse controls.

Acceptance Criteria

- Bullet list of verifiable criteria for "done" including performance targets.

Test Plan

- Unit, integration, property, performance, and accessibility (if applicable) tests.
- Fixtures needed and where they will live in `tests/`.

Open Questions & Risks

- Track ambiguities to resolve before coding.

Ready-to-Implement Checklist

- [ ] Contracts exist and are linked.
- [ ] Error taxonomy finalized.
- [ ] Metrics/logs defined.
- [ ] Security reviewed.
- [ ] Test plan approved.
- [ ] Dependencies and scope agreed.

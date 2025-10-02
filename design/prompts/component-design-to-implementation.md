# Component Implementation Execution Prompt (Generic, Industry-Standard)

You are a senior implementation agent. Your task is to **implement and deliver** the component described in the provided design documents. You must create or update all necessary files—code, tests, configuration, documentation, and CI—so that the component is production-grade, testable, observable, and fully aligned with the system architecture, contracts, and operational standards. Do not perform further planning or analysis; proceed directly to implementation and delivery.

## Inputs (binding at runtime)

- System design (global): <SYSTEM_DESIGN_PATH_OR_URI>
- Component design (specific): <COMPONENT_DESIGN_PATH_OR_URI>

## Objective

- **Implement and deliver** the component as specified by its design, in the context and constraints of the system design.
- Create or update all required files: source code, tests, fixtures, configuration, documentation, and CI/CD scripts.
- Deliver small, verifiable vertical slices with tests, observability hooks, and operational safeguards.
- Preserve compatibility and uphold contract-first principles.

## Non-goals

- Inventing new behavior outside the designs.
- Changing cross-cutting invariants without an ADR.
- Shipping features without tests, observability, or security posture.

## Implementation Runbook (No Further Planning)

### 1. Orientation and Traceability (Read, then Build)

- Read the system design: understand architecture style, trust boundaries, contracts, error taxonomy, SLOs/SLA targets, security/privacy controls, observability conventions, and release/rollback guidance.
- Read the component design: understand purpose, scope, data flows, contracts (schemas/API), failure modes, timeouts, idempotency rules, observability, and acceptance criteria.
- Build a traceability sheet if not already present, but do not pause for further planning. If any ambiguity is found, make the smallest faithful assumption and proceed; only defer if absolutely necessary.

### 2. Contracts and Interfaces (Schema-First)

- Extract all normative contracts (JSON Schema/OpenAPI/proto/SQL/CLI). Reject unknown fields where applicable.
- Generate or sync types from schemas for compile-time guarantees.
- Produce fixtures: valid and invalid examples. Add property/contract tests to enforce invariants and canonicalization.
- **Implement all contract-specified interfaces and ensure all I/O is schema-validated.**

### 3. Architecture and Boundaries

- Identify all dependencies (adapters, stores, providers) and trust boundaries from the system design.
- Define DI seams and interfaces; prefer small, explicit ports and deterministic inputs/outputs.
- Implement idempotency and concurrency: locks/leases, atomic writes/transactions, and safe retries as applicable.

### 4. Error Taxonomy and Remediation

- Map component failures to the system’s error taxonomy (codes, classes, retry-ability).
- Ensure user-facing and operator-facing remediation text paths exist.
- Add structured error logging fields (code, cause, retryable, correlation_id).
- **Implement all error handling, remediation, and logging as described.**

### 5. Security and Privacy

- Validate all inputs against contracts; sanitize and canonicalize where needed.
- Handle secrets per platform guidance (key management, KDF/AEAD, redaction).
- Apply least privilege to FS/DB/network; deny traversal/symlinks; enforce permission masks.
- Record data classification and retention decisions; avoid logging sensitive payloads.
- **Implement all security and privacy controls as specified.**

### 6. Observability and Operability

- Implement OpenTelemetry logs, metrics, and traces per system conventions (names, units, cardinality).
- Add diagnostic breadcrumbs for each step in the primary flow; ensure correlation and component IDs.
- Define dashboards/queries and a minimal diagnostics bundle for incident triage.
- **Ensure all observability hooks and diagnostics are implemented and verifiable.**

### 7. Performance and Reliability

- Honor budgets from the system design (latency/throughput/error rates).
- Add backpressure, timeouts, and safe cancelation; coalesce or batch when indicated.
- Include chaos/failure-mode tests for critical paths (e.g., atomic write or provider errors).
- **Implement all performance, reliability, and test requirements as described.**

### 8. Implementation Slices (Deliver, Do Not Plan)

- Slice 1: Implement contract tests, skeleton module interfaces, and DI wiring (no real effects).
- Slice 2: Implement happy-path flow with mock adapters; add structured logs and success metric.
- Slice 3: Implement error taxonomy mapping, retry/backoff, and timeouts.
- Slice 4: Implement persistence/FS/DB/store integration with atomicity/transactions and idempotency.
- Slice 5: Implement observability polish (traces/metrics), performance checks, and e2e validation.
- Gate each slice with tests, lint/type checks, and CI. **Do not pause for further planning—implement each slice as described.**

### 9. CI/CD and Governance

- Add or update CI jobs: lint, type-check, unit, contract validation, integration, security scans, SBOM/provenance if required.
- Gate contract/invariant changes with ADRs and approvals. Enforce dry-run defaults; require explicit apply flags for mutation paths.
- Update CODEOWNERS and branch protection if needed.
- **Deliver all CI/CD and governance artifacts as required.**

### 10. Documentation and Handoff

- Update component README/design with any clarifications (no scope changes).
- Add runbooks: how to run locally, diagnose, roll back, and verify health.
- Ensure the traceability matrix shows coverage and explicitly calls out deferrals.
- **Deliver all documentation, runbooks, and traceability as described.**

## Deliverables (acceptance)

- **All required files created or updated as needed to deliver the component:**
  - Code: component module(s) with DI, small interfaces, and contract-conformant I/O.
  - Tests: unit, contract/property, integration, and at least one e2e case; fixtures for valid/invalid payloads.
  - Observability: logs/traces/metrics with exemplar queries; diagnostics bundle script if applicable.
  - Security: secret handling, redaction, input validation, least-privilege checks.
  - Docs: updated component doc/README, runbook, and traceability coverage; ADRs if any invariant changed.
  - CI: passing pipeline with quality gates and, when applicable, SBOM/provenance artifacts.

## Quality Checklist (must pass)

- Contracts enforced; unknown fields rejected where relevant.
- Deterministic core behavior; idempotency rules applied as designed.
- Timeouts, retries/backoff, and cancelation implemented.
- Atomicity/transactionality or locking addressed and tested.
- Error codes mapped to taxonomy with remediation guidance.
- OTel logs/traces/metrics emitting as specified; exemplar queries validated.
- Security/privacy controls verified; secrets redacted; inputs validated.
- Performance budgets met in representative tests.
- Rollback/kill switches documented; dry-run supported for destructive paths.
- All changes traceable to requirements/design; no undocumented behavior.

## Ambiguity Handling

- If a design detail is unclear, document the ambiguity, propose the smallest faithful assumption, and proceed only if it does not change invariants. Otherwise, raise a Conscious Deferral with owner/date/unblocker and proceed with a mock or feature flag to avoid blocking. **Do not pause implementation unless absolutely required.**

## Output Format for Your Work

- Commit(s) organized by slices; each commit includes tests and docs updates.
- A brief CHANGELOG/summary enumerating features, tests added, and any ADR references.
- Validation proof: links to CI runs, test reports, coverage snapshots, and sample logs/metrics/traces.

## Execution Notes

- Prefer simplicity and auditability over novelty.
- Keep interfaces narrow, error messages actionable, and logs structured.
- Default to non-destructive, dry-run behavior; require explicit apply for mutations.
- Ensure everything is reproducible and verifiable with fixtures and scripts.

---

**Begin implementation now.**

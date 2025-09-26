# KMV Console — Guided Developer README

A local-first, single-user research console with governed Markdown vaults, strict YAML routing, atomic Apply bundles, and immutable audit.

## Product overview — What KMV is and why it matters

KMV (Knowledge Management Vault) is a focused, local-first research assistant for builders, researchers, and solo teams who need rigor, structure, and auditability in their knowledge work. It combines LLM assistance with strong governance: every change is a validated PROPOSAL, every write is atomic and auditable, and the vault remains consistently organized by policy-driven routing.

Why use KMV?

- Stay organized: enforced routing and schema validation prevent structure drift and reduce cleanup work.
- Stay auditable: immutable, hash-chained audit logs make every action traceable and verifiable.
- Stay productive: LLM-assisted proposal generation and an optional prompt-refinement workflow speed high-quality research and note creation.
- Stay safe: local-first operation, encrypted secrets, and explicit approval gates minimize leakage and mistakes.

Who benefits most?

- Individual researchers who need a disciplined knowledge workflow.
- Engineers and teams documenting design decisions, ADRs, and evolving technical knowledge.
- Knowledge workers who want provable, auditable changes rather than ad-hoc notes.

How KMV helps you get work done (high level)

1. Turn a learning goal or research prompt into a governed PROPOSAL (optionally refined by the curriculum architect template).
2. Validate the PROPOSAL against routing and schema rules; fix issues before any write.
3. Approve and Apply atomically; KMV updates the inventory and logs the action immutably.
4. Run health checks to keep the vault maintainable (split large notes, fix broken links, suggest related notes).

For concrete implementation details, contracts, and developer guidance, see the rest of this README and the referenced design and contract files below.

## What to Read First

- Product requirements (source of truth): `design/requirements.md`
- System design (implementation-ready): `design/system-design.md`
- Contract schemas (validation): `contracts/*.schema.json`
- Routing governance: `routing.yaml`
- App settings (local): `settings.json`
- Prompt refinement template (agent behavior): `design/prompts/curriculum-architect-template.md`
- Requirements → System Design super-prompt (generic): `design/prompts/requirements-to-system-design.md`

## Core Principles (you must internalize)

- Proposal-driven writes only: Research → Proposal → Validate → Approve/Reject → Apply.
- Atomic, idempotent Apply bundles with post-Apply validation and audit chaining.
- Health checks are proposal-only and cancellable; they never write without approval.
- Security by default (AES-GCM, Argon2id) and no plaintext secrets.
- Accessibility baseline WCAG 2.1 AA (see deltas for 2.2 in the design file).

See: `design/system-design.md` §1–2.

## Daily Flow (hands-on)

1) Refine your goal (optional but recommended)
   - Use the Prompt Refinement Service (PRS) to produce a structured study plan and a refined prompt.
   - Template and behavior: `design/prompts/curriculum-architect-template.md`
   - Requirements reference: `design/requirements.md` → F0 Prompt Refinement
   - Outputs: `RefinedPromptV1` + `StudyPlanV1` (see `contracts/`)

2) Draft Proposals from the plan
   - Select modules from the study plan and generate draft `ProposalV1` objects (no writes yet).
   - Governance continues to be enforced by `routing.yaml`.

3) Validate and Approve
   - Validator yields a `ValidationReport` (errors block approval; warnings allow proceed).
   - Confirm scope, paths, tags, and status.

4) Apply (atomic bundle)
   - Apply performs safe temp+rename writes, then reindex, append audit, and enqueue health checks.
   - Receipts and audit entries are idempotent and chained.

5) Post-Apply Health Checks
   - Event-driven; detect link gaps/orphans, neighbor rewrites, and topic sprawl.
   - Produce health proposals only; you approve or reject them.

See: `design/system-design.md` §2.4, §3, §4, §5.

## Files You Will Touch

- `routing.yaml` — SSOT for topic→folder/status/tags rules.
- `settings.json` — provider, keys, vault path, timezone (local-only).
- `contracts/` — JSON Schemas: `ProposalV1`, `ValidationReport`, `ApplyBundleV1`, `AuditRecord`, `VaultEntry`, refinement contracts.
- `design/` — requirements, system design, prompts. Treat requirements as binding and design as implementation-ready.

Avoid duplicating logic across files; if rules change, update routing, contracts, and design docs together.

## Governance & Quality Gates

- Proposals must match `routing.yaml` and `contracts/*.schema.json`.
- Apply is atomic and idempotent per `bundle_hash` (See `design/system-design.md` §4.4).
- Performance budgets: Prompt→Proposal p50 ≤ 10s / p90 ≤ 20s; Apply ≈ ≤ 1s/file; Reindex 5k ≤ 30s full, ≤ 5s incremental (See §10).
- Accessibility: keep WCAG 2.1 AA; adopt 2.2 improvements where applicable (See §8).

## Health & File Organization

- Health checks recommend splits when files get agglomerated/confusing (objective thresholds in `design/system-design.md` §5).
- Folder vs File criteria are enforced by routing; keep atomic concepts as standalone notes; group multi-dimensional topics into folders.

## Extending the System (safe changes)

- Add a topic/folder: update `routing.yaml` and adjust UI hints if needed.
- Evolve a schema: update the corresponding file in `contracts/`, then cross-reference in `design/system-design.md`.
- New validation rule: extend the Validation Service rules and update `ValidationReport` mapping.
- New provider: add an adapter; never log secrets; update `settings.json` handling and tests.

## Testing & Verification (where to look)

- Contracts: Ajv fixtures for valid/invalid payloads (See `design/system-design.md` §10).
- Property tests: idempotent Apply, atomic write chaos between temp/rename (§4).
- Error-path tests: each error code maps to clear remediation (§6).
- Accessibility smoke: announce validation and apply outcomes (§8).
- Audit verifier: recompute the JSONL hash chain (§10).

## Troubleshooting

- Routing mismatch: consult `routing.yaml` and the `ValidationReport.ruleId`.
- Path collisions: adjust slugs or approve explicit modify in the proposal.
- Health checks keep cancelling: another prompt/apply is in-flight; wait or retry.
- Secrets issues: ensure `settings.json` encryption metadata is valid (See §7).

## Documentation Hygiene

- Requirements → Design → Contracts must stay in sync.
- Use `design/prompts/requirements-to-system-design.md` to regenerate `system-design.md` from updated requirements.
- Use `design/prompts/curriculum-architect-template.md` to refine learning goals consistently.

## Glossary (quick)

- Proposal — a schema-validated, governed change request (`contracts/ProposalV1.schema.json`).
- Apply — atomic write bundle with receipts and audit.
- Health proposal — a non-writing, event-driven suggestion to maintain structure.
- Inventory — `vault.json` with index fields (`contracts/VaultEntry.json`).

For anything not covered here, defer to:

- `design/requirements.md` for scope and acceptance criteria.
- `design/system-design.md` for implementation details and contracts.
- `contracts/` for machine-validated shapes.

## Functional overview (what this system actually does)

This section explains, at a glance, the concrete runtime pieces you will implement or interact with and how they fit together. For authoritative details see `design/system-design.md` and `contracts/*.schema.json`.

- UI (Next.js/React)
  - Single-page app for prompts, proposal review, validation feedback, apply gate, inventory browser, and settings.
  - Primary interactions: submit/refine prompt, review ProposalV1, approve/reject, run enhancements, inspect inventory.

- Local API (Node/Express)
  - Exposes services used by the UI; all inputs and outputs follow strict contracts in `contracts/`.
  - Key services:
    - Proposal Service — accepts a prompt (or refined prompt) and returns a `ProposalV1` (see `contracts/ProposalV1.schema.json`).
    - Validation Service — consumes `ProposalV1`, `routing.yaml`, and `vault.json` and returns a `ValidationReport` (`contracts/ValidationReport.schema.json`).
    - Apply (Bundle) Service — executes atomic writes described by `ApplyBundleV1` and returns `ApplyReceipt` objects (`contracts/ApplyBundleV1.schema.json`, `contracts/ApplyReceipt.schema.json`).
    - Inventory Service — maintains `vault.json` entries (`contracts/VaultEntry.json`) and near-duplicate hints.
    - Audit Service — append-only JSONL with hash chaining (`contracts/AuditRecord.json`).
    - Prompt Refinement Service (PRS) — optional pre-proposal step producing `RefinedPromptV1` and `StudyPlanV1` (see `design/prompts/curriculum-architect-template.md` and `contracts/`).
    - Health Check Orchestrator — post-Apply analysis that emits health PROPOSALs (read-only; no automatic writes).

- Data & on-disk artifacts
  - `routing.yaml` — SSOT for routing rules and governance.
  - `vault.json` — inventory index (path/title/topic/status/tags/mtime/size/content_hash).
  - Markdown vault files — actual notes (frontmatter + body).
  - `audit.log` — append-only JSONL with hash chain for tamper evidence.
  - `undo.log` — bounded undo buffer (last 3 reversible operations).
  - `settings.json` — encrypted config (AES-GCM / Argon2id); do not commit secrets.

- Main runtime flows (high-level)
  1. Optional: Refine goal → PRS returns StudyPlanV1 + RefinedPromptV1 (see `design/prompts/`).
  2. User triggers Proposal → Proposal Service returns `ProposalV1`.
  3. Validation Service produces `ValidationReport` (errors block approval).
  4. User approves → Apply Service writes atomic bundle, updates `vault.json`, and appends `audit.log`.
  5. Health Check runs (event-driven) and may emit health PROPOSALs for approval.

- Contracts are normative
  - All service I/O must conform to the JSON Schemas in `contracts/`. Add or update schemas before changing service behavior.

- Where to start coding
  - Implement contract tests first (Ajv fixtures). See `design/system-design.md` §10 for the test plan and performance targets.

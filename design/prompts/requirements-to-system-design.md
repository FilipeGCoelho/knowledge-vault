# KMV Console — System Design Super-Prompt

You are GPT-5, acting as a principal software architect and staff product designer.

## Canonical Inputs

- `requirements.md` (Revised v3) — **source of truth**. Treat it as normative and binding.
- `system-design.md` (current) — **inspiration only**; use solely for comparison and deltas. Do not inherit mistakes or gaps.

## Outcome

DO NOT GENERATE A RESPONSE WITH ALL THE CONTENT IN IT; GENERATE A FILE THAT I CAN DOWNLOAD INSTEAD.
Produce a single file named **`system-design.md`** that is implementation-ready, standards-aligned, and testable. It must:

1) Fully satisfy and trace to `requirements.md` v3.
2) Be explicit about architectural choices, constraints, and tradeoffs.
3) Include contracts, failure modes, performance envelopes, and test hooks.
4) Avoid scope creep and over-engineering.
5) FOLLOW markdownlint syntax rules. both files provided follow those rules, just copy the style.

---

## Non-Negotiable Design Tenets (from requirements v3)

- **Local-first, single user, no Git.** All writes go through **PROPOSAL → Approve/Reject → Apply**.
- **Transactional Apply bundles:** may create/modify/delete/link **multiple files atomically**, idempotent by `bundle_hash`, with post-Apply validation.
- **Event-driven Health Checks:** triggered **after** vault changes, **proposal-only**, and **cancellable/abortable** if a new prompt/Apply begins; analyze changed paths + neighbors; address **link integrity**, **neighbor rewrites**, and **topic sprawl vs filename/route**; never write without approval.
- **Enhancement = body-only**, one at a time.
- **Audit:** immutable JSONL with hash chaining; **origin** must be `prompt | enhancement | health_check`, with **justification** and **bundle map**.
- **Security of secrets:** AES-GCM at rest with Argon2id-derived key; never log secrets.
- **File safety:** path normalization, traversal/symlink rejection, **temp+rename** atomicity on same device.
- **Performance targets:** Prompt→PROPOSAL p50≤10s/p90≤20s, Apply≈≤1s/file (~≤64KB), Reindex 5k ≤30s full/≤5s incremental.
- **Accessibility:** WCAG 2.1 AA minimum (acknowledge WCAG 2.2 deltas).
- **Undo:** last 3 actions (bundle-aware), with precondition checks.

---

## Required Structure of `system-design.md`

### 1 Context & Goals

- Summarize problem, constraints, and the decision to be **local-first**.
- Enumerate the **explicit non-goals** (multi-tenant, Git, GDPR in v1).

### 2 Architecture Views (C4-inspired, concise)

- **Context View:** actors (User, LLM Provider, Local Filesystem).
- **Container View:** UI (Next.js/React), API (Node/Express), Adapters (LLM/FS/Crypto), Data Stores (`routing.yaml`, `vault.json`, Markdown, `audit.log`, `settings.json`, `undo.log`).
- **Component View (services):**
  - Proposal, Validation, Apply (bundle), Inventory, Health Check Orchestrator (read-only + PROPOSAL emit), Audit, Settings.
  - For each service include **I/O contracts**, **happy path**, **failure modes**, **timeouts**, **idempotency keys**, and **observability fields**.
- **Operational View:** end-to-end sequences for: Prompt→Proposal→Validate→Approve→Apply→Audit→Reindex; Enhancement (body-only); Health Check trigger/abort/resume.
- **Deployment View (local)**: local web server vs desktop shell (note implications for file pickers, key storage).

### 3 Critical Contracts & Schemas (normative)

- **ProposalV1** JSON Schema (strict) with allowed enums and `governance.rationale`.
- **ValidationReport** JSON structure with `severity={error|warning}` and `ruleId`.
- **Apply Bundle spec:** `{ actions[]: [{op, path, content?, link_target?}], bundle_hash }`.
- **AuditRecord:** `origin`, `justification`, `bundle_map`, `prev_hash`, `record_hash`.
- **vault.json entry**: index fields incl. `content_hash`, `mtime`, `size`.

> Provide schemas as fenced `json` blocks, ready for Ajv.

### 4 File Safety & Concurrency

- **Atomic write** algorithm (temp file, fsync(file)→fsync(dir)→rename same device→fsync(parent)).
- **Locking:** per-path lock files (`O_EXCL`); inventory lock for full reindex; crash cleanup of stale locks.
- **Path hygiene:** normalized absolute paths within vault; reject traversal (`..`), symlinks, and cross-device renames.
- **Idempotency rules:** Apply dedups on `bundle_hash` + `content_hash`.

### 5 Health Checks: Design & Governance

- **Event loop:** scheduled **after** successful Apply; coalesce rapid Applies (e.g., 2s window).
- **Cancellation:** new prompt/Apply cancels pending or aborts running health checks; reschedule after next change.
- **Analysis scope:** changed paths + inbound/outbound neighbors.
- **Detections:** link graph gaps/orphans; neighbor rewrite suggestions; **topic sprawl** vs filename/route (include default thresholds: 64KB, >12 headings, >2 topics, >50 outbound links; configurable).
- **Outputs:** one or more **Health PROPOSALs** (split/extract/relink/rewrite) with reasons, thresholds hit, affected paths, impact summary.
- **No writes:** proposals only; must pass the standard approval gate.

### 6 Error Taxonomy & UX Remediation

- Normative table: `SCHEMA_INVALID, ROUTING_MISMATCH, PATH_COLLISION, FS_NO_SPACE, FS_PERMISSION, CONFIG_CORRUPT, LLM_TIMEOUT, LLM_429, LLM_MALFORMED`.
- For each: **class**, **retry-ability**, **typical cause**, **UI remediation** text.

### 7 Security & Privacy

- **Secrets:** AES-256-GCM, random nonce, store auth tag; Argon2id KDF parameters; passphrase rotation flow; never log plaintext (redact).
- **OWASP alignment:** map controls (input validation, output encoding where applicable, error handling/logging, data protection at rest).
- **Local session hygiene:** inactivity lock recommendation; minimal telemetry (none by default).
- **Threats & mitigations (STRIDE-lite):** symlink attacks, path traversal, partial writes, proposal tampering, LLM prompt injection (format repair loop + strict parse).

### 8 Accessibility & UX Standards

- Baseline **WCAG 2.1 AA** with call-outs for **WCAG 2.2** criteria that improve the flows (e.g., focus appearance, dragging movements); plan for automated checks (axe) and live region announcements for validations.

### 9 Observability & SLIs

- **Structured logs:** `ts, correlation_id, proposal_id, proposal_hash, action, code, outcome`.
- **SLIs:** Prompt→Proposal latency, Apply success rate, Validation failure rate (user vs system), Reindex throughput, Health check turnaround.
- **Diagnostics export:** redacted `settings.json`, `routing.yaml`, latest `vault.json`, `audit.log` tail, environment snapshot.

### 10 Performance Engineering & Test Plan

- Budgets: honor p50/p90 targets; design for time-sliced health checks.
- **Test harness:** contract fixtures (valid/invalid), property tests for idempotency, chaos test for atomic write (kill between temp/rename), error-path tests → correct UI remediation, accessibility smoke, audit chain verifier CLI.

### 11 Traceability Matrix

- Table mapping **each requirement** (F1,F2,...FN, NFRs) → **design section(s)** → **tests** → **observability fields**.
- Mark any gaps; if a requirement is intentionally deferred, state why and where it will live later.

### 12 Architecture Decisions (Pointers)

- Reference ADRs (UI framework, Node API, LLM adapter, secrets, audit JSONL, Apply atomicity, undo model, offline w/o queueing). Cite consequence of each decision on the design.

### 13 Risks & Mitigations

- LLM variance; filesystem semantics across OSes; large vault scalability; performance tail risks; user bypass edits. Include concrete mitigations and fallback modes.

### 14 Diagrams (Mermaid)

- Minimal but sufficient: Context, Container, Sequence (Prompt→…→Reindex), State (Proposal: Draft→Validated→Approved→Applied/Rejected).

---

## Method & Rigor Requirements

1) **Deep Analysis First:** Before writing any section, read `requirements.md` fully. List any ambiguities you detect and resolve them inline with explicit assumptions that remain faithful to the requirements’ spirit (do not expand scope).
2) **Standards Alignment:** Align security and accessibility with authoritative sources. When you assert a standard or practice, cite it inline with a short reference note.
   - OWASP ASVS overview and sections relevant to cryptography at rest, error handling/logging, input validation. [refs]
   - WCAG 2.2 deltas vs 2.1 for awareness; keep 2.1 AA as the baseline. [refs]
   - POSIX `rename()` atomicity on same device and its constraints. [refs]
   - Argon2id recommendations for password-derived keys. [refs]
3) **No improvisation:** If a choice is not derivable from requirements + standards, mark it as a **conscious deferral** with minimal viable placeholder.
4) **Verification Hooks:** Every design claim should point to either:
   - A test (contract/property/e2e), or
   - An SLI/log field that will prove it in runtime.
5) **Clarity over cleverness:** Prefer simple, auditable mechanisms over complex ones. Explain why alternatives were not chosen.

---

## Output Rules

- **Single deliverable:** one `system-design.md` file.
- **Tone:** concise, technical, implementation-ready. No marketing language.
- **Formatting:** use Markdown headings, fenced code blocks for schemas, and Mermaid for diagrams.
- **Traceability:** include the full matrix.
- **Completeness gate:** At the end, include a “**Design Review Checklist**” showing each requirement and whether it is fully addressed, partially addressed (with a plan), or deferred.

---

## References You MUST Consult While Drafting

- OWASP ASVS (overview and sections on crypto, logging, input handling). :contentReference[oaicite:0]{index=0}
- WCAG 2.2 (and “What’s new” vs 2.1) — maintain 2.1 AA baseline, note 2.2 relevant additions. :contentReference[oaicite:1]{index=1}
- POSIX `rename()` semantics to support atomic write strategy on same device. :contentReference[oaicite:2]{index=2}
- Argon2id recommendations for password-derived keys. :contentReference[oaicite:3]{index=3}

Deliver `system-design.md` only after satisfying this prompt’s gates.

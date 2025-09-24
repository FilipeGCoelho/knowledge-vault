# KMV Console - Web Application Requirements Definition

## 1 Product Vision & Context

### Mission Statement

Build a web console that lets a user research new information through LLM-assisted prompting, and manage a Markdown knowledge vault governed by YAML as the single source of truth (SSOT).  
The app enforces structure (never improvises), makes all changes auditable, and ensures output formatting aligns with YAML rules.  
The workflow is **Research → PROPOSAL → Approve/Reject → Apply**, keeping the user in control at all times.

### Target Audience & Persona

* **Single User (Researcher/Owner)** — submits prompts, reviews machine-generated PROPOSALs, approves/rejects suggestions, manages the vault, and audits changes.

### Business Goals & Success Metrics

* **Consistency:** 100% of created notes conform to `routing.yaml` schema and paths.
* **Velocity:** Reduce time from prompt → approved PROPOSAL → generated file to ≤ 10s p50, ≤ 20s p90.
* **Quality:** ≤ 1% rejected writes due to schema violations (rolling 30 days).
* **Safety:** 0 critical incidents of structure drift or unauthorized writes.
* **Organization:** Data always structured in an organized fashion, following rules defined in `routing.yaml`.

---

## 2 Scope & Assumptions

### Features In Scope

* Receive prompt from user.
* Read & validate `km/routing.yaml` and `vault.json` (inventory).
* Validate if the prompt aligns with inventory or routing rules.
* LLM prompt runner (Gemini 2.5 Pro initially; provider-agnostic abstraction).
* Generate PROPOSALs, validate against inventory/routing, and present to user.
* Approval gate with diff preview; Apply writes file strictly according to approved PROPOSAL.
* Inventory management (frontmatter extraction, duplicate detection, related links).
* Governed creation of new note types via PROPOSAL flow.
* Audit log for all actions.
* Error/exception handling across all features, with rollback where possible.
* Undo capability for up to 3 actions backwards.

### Out of Scope (Explicit)

* Arbitrary file edits outside governed flows.
* Multi-tenant SaaS (initially single vault instance).
* Image/media asset management pipelines.
* Git integration.
* GDPR compliance.

### Key Assumptions & Dependencies

* Vault is a master folder on a local filesystem (or mounted volume).
* Node.js for runtime; optional Python indexing may be embedded/ported.
* LLM API key provided by user and stored locally in system folder.
* File system is never directly modified outside of Apply; all blocking logic enforced at UI level.

---

## 3 Functional Requirements

### 3.1 User Stories

* As a User, I want to submit a research prompt, receive a machine-generated PROPOSAL that follows `routing.yaml`, and approve or reject it.
* As a User, I want the system to block any action that violates `routing.yaml` and to propose paste-ready YAML when rules are missing.
* As a User, I want to review history and diffs for prompts, PROPOSALs, approvals, and applies.

### 3.2 Detailed Feature List & Acceptance Criteria

#### F1 — Prompt → PROPOSAL

* **Description:** UI form to submit prompt; backend reads `km/routing.yaml` + `vault.json`, calls LLM, parses strict output.
* **Acceptance criteria:**
  * ≥ 95% of responses parsed without manual edits.
  * If routing is missing, output includes `routing_yaml_snippet`, justification, and impacts.
  * Output stored as `.km_last_proposal.yaml`.
  * Turnaround ≤ 10s p50, ≤ 20s p90 for payloads ≤ 300 KB.
  * On error: clear message shown; process aborts with no filesystem effect.

#### F2 — PROPOSAL Viewer & Schema Validator

* **Description:** Render PROPOSAL; verify keys, status ∈ allowed, paths match routes; highlight mismatches.
* **Acceptance criteria:**
  * Invalid PROPOSAL cannot be approved (Approve button disabled with error reasons).
  * Shows `related_links` existence with indicators.
  * Displays which route matched and why.
  * On error: PROPOSAL rejected with reasons; user may retry.

#### F3 — Apply (Write)

* **Description:** Approval gate writes one file per PROPOSAL with frontmatter shell and content body.
* **Acceptance criteria:**
  * Apply requires explicit confirmation (checkbox + modal).
  * Writes exactly one file to `target_folder/filename`; body includes frontmatter + H1 title + content.
  * If path exists, operation aborted with actionable message.
  * Post-write validation passes (schema, status, route conformity).
  * On error: file write aborted, no partial filesystem changes.

#### F4 — Inventory & Reindex

* **Description:** Generate/refresh `vault.json` with `{path,title,topic,status,tags}` by scanning frontmatter.
* **Acceptance criteria:**
  * Reindex completes in ≤ 30s for 5k files; ≤ 5s incremental.
  * Inventory detects near-duplicates (title/slug/topic overlap) and populates `related_links`.
  * If inventory lacks context, system triggers introspection PROPOSAL for user approval.

#### F5 — Audit Log

* **Description:** Store prompt, PROPOSAL, approval event, apply result.
* **Acceptance criteria:**
  * Immutable log entries (no deletion/modification through UI).
  * Log includes timestamp, action type, artifact references.
  * Logs stored locally in append-only file(s).
  * Export to CSV/JSON supported.
  * On error: log write retried; if still failing, alert shown but user action preserved.

#### F6 — Settings & Providers

* **Description:** Configure LLM provider (Gemini by default), API key, time zone/locale, path to vault.
* **Acceptance criteria:**
  * Provider switch without code changes.
  * API keys stored in system folder at project root, encrypted at rest.
  * Test call available.
  * On error: show reason and prevent save.

#### F7 — Governance: New Note Type Flow

* **Description:** Guided wizard to add new schema/route via PROPOSAL.
* **Acceptance criteria:**
  * Wizard injects snippet to `routing.yaml` at correct section; shows diff preview.
  * Requires user approval; re-runs PROPOSAL automatically after merge.

#### F8 — Edit/Enhancement: Content Body Updates

* **Description:** User can highlight part of a file body and enhance it via prompt.
* **Acceptance criteria:**
  * Enhancements restricted to file body only (frontmatter untouched).
  * Enhancements follow same syntax/validation rules.
  * Only one enhancement process active at a time.
  * Process finishes once a response is returned and user approves/rejects.
  * On error: process halted, no filesystem change.

---

## 4 Non-Functional Requirements

### Performance

* Prompt → PROPOSAL: ≤ 10s p50 / ≤ 20s p90.  
* Apply write: ≤ 1s for single file.  
* Reindex 5k files: ≤ 30s full, ≤ 5s incremental.

### Security

* **OWASP:** CSRF protection, authenticated session, input sanitation.
* **Secrets:** API keys encrypted at rest, stored in system folder; never in repo.
* **Audit:** Immutable log entries.

### Accessibility (WCAG 2.1 AA)

* Keyboard navigable; focus states visible.  
* Color contrast AA; aria labels on controls.  
* Screen-reader announcements for validation errors and apply success.

### Usability & UX Standards

* Clear statuses & route explanations.  
* Zero-ambiguous error text.  
* “Why blocked?” tooltips with rule ID and fix.  
* Undo for up to 3 actions backwards.

### Reliability & Availability

* Local-first; reads/writes succeed offline.  
* Apply is idempotent per PROPOSAL hash; double-submits prevented.  
* Error handling defined for all features; rollback guaranteed.

### Maintainability

* Clean architecture: UI (Next.js/React) + API (Node/Express) + Providers layer + FS adapter.  
* Config via `.env` or `settings.json`.  
* Typed interfaces; robust unit/integration tests.  

---

## 5 Prioritization

### MoSCoW

#### Must

* F1 Prompt→PROPOSAL  
* F2 PROPOSAL Validator  
* F3 Apply (frontmatter + content)  
* F4 Inventory & Reindex  
* F5 Audit Log  
* F8 Edit/Enhancement  
* Provider: Gemini 2.5 Pro  

#### Should

* F6 Settings & Providers abstraction  
* Near-duplicate detection & related links helper  

#### Could

* Bulk Apply for batch PROPOSALs  
* Route visualization (graph)  

#### Won’t (Initial)

* Multi-tenant cloud service  
* Git integration  
* GDPR compliance  

### Release Roadmap (Suggestion)

* **R0 (MVP, 2–3 weeks):** F1, F2, F3, F4, minimal Audit Log, Gemini provider.  
* **R1:** F5 full log, F6 Settings, duplicate detection, improved inventory.  
* **R2:** Governance wizard (F7), provider plug-ins (OpenAI/Anthropic), route visualization.  

---

## 6 Risks & Open Questions

### Known Risks

* **LLM variance:** Model might deviate from strict format.  
  * **Mitigation:** Strong system prompt + strict schema parser + retry with format-repair.  
* **File contention:** Concurrent Apply attempts.  
  * **Mitigation:** PROPOSAL locking via hash; idempotent Apply.  
* **Routing drift:** Manual edits bypass app.  
  * **Mitigation:** Validation against `routing.yaml` before Apply; reindex job.  

### Open Decisions

* Python indexer vs. pure Node implementation.  
* Long-term storage of audit logs: append-only file vs. embedded DB.  

---

## 7 Appendices

### A PROPOSAL Contract (Enforced)

* All output follows strict PROPOSAL format.  
* If YAML cannot resolve routing: PROPOSAL includes snippet and justification.  

### B ISO/IEC 25010 Mapping (Selected)

* **Functional suitability:** PROPOSAL gating, schema enforcement.  
* **Performance efficiency:** Targets in §4.  
* **Compatibility:** Vault-friendly files; provider abstraction.  
* **Usability:** Clear validation & reasons; accessible UI.  
* **Reliability:** Idempotent Apply; offline-friendly.  
* **Security:** OWASP controls; secrets handling; audit.  
* **Maintainability:** Modular architecture; tests; typed contracts.  
* **Portability:** Local filesystem; Dockerfile (future).  

### Implementation Notes

* **Stack:** Next.js (UI), Node/Express (API), filesystem adapter, provider SDK (Gemini), optional Python indexer.  
* **KMV owns scripts:** The app ships inventory & Apply logic; users only run the app—no manual scripting required.  
* **No silent improvisation:** Every action re-reads `routing.yaml`; missing rules → PROPOSAL.  

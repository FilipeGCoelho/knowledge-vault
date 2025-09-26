# KMV Console - Web Application Requirements Definition (Revised v3)

## 1. Product Vision & Context

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

## 2. Scope & Assumptions

### Features In Scope

* Receive prompt from user.  
* Read & validate `km/routing.yaml` and `vault.json` (inventory).  
* Validate if the prompt aligns with inventory or routing rules.  
* LLM prompt runner (Gemini 2.5 Pro initially; provider-agnostic abstraction).  
* Generate PROPOSALs, validate against inventory/routing, and present to user.  
* Approval gate with diff preview; Apply writes file(s) strictly according to approved PROPOSAL.  
* Inventory management (frontmatter extraction, duplicate detection, related links).  
* Governed creation of new note types via PROPOSAL flow.  
* Audit log for all actions.  
* Error/exception handling across all features, with rollback where possible.  
* Undo capability for up to 3 actions backwards.  
* **Prompt Refinement**: pre-proposal step to transform a learning goal into a structured study plan and refined prompt (no writes).  
* **Health checks**: validate file cohesion, linking, topic boundaries, and file-to-file balance.  

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

## 3. Functional Requirements

### 3.1 User Stories

* As a User, I want to submit a research prompt, receive a machine-generated PROPOSAL that follows `routing.yaml`, and approve or reject it.  
* As a User, I want the system to block any action that violates `routing.yaml` and to propose paste-ready YAML when rules are missing.  
* As a User, I want to review history and diffs for prompts, PROPOSALs, approvals, and applies.  
* As a User, I want the system to execute **health checks** after vault modifications, producing PROPOSALs to correct structural drift, broken links, or files becoming multi-topic repositories.  
* As a User, I want to refine my initial goal into a structured plan and a higher-quality prompt before generating proposals, to optimize learning structure and note placement.  

### 3.2 Detailed Feature List & Acceptance Criteria

#### F0 — Prompt Refinement (Enhanced)

* **Description:** Before generating a PROPOSAL, run a Prompt Refinement Service (PRS) to transform the raw learning goal into a structured Study Plan (StudyPlanV1) and a Refined Prompt (RefinedPromptV1). PRS outputs are advisory; no vault writes occur during refinement.  
* **Scope:** Applies to learning goals in any topic; uses the curriculum-architect template; results are consumed by the Proposal Service when a draft is created.  
* **Inputs:** `PromptRefinementInput` (goal, optional contextRefs, lensWeights).  
* **Outputs:** `RefinedPromptV1` and `StudyPlanV1`; optional `routing_suggestions` per module for later drafting of PROPOSALs.  
* **Lifecycle:** Stateless refinement with a two-repair format loop (repair attempts capped at 2); results are hashed for audit traceability.  
* **Endpoints / Interfaces:** Expose PRS via POST `/refine` returning { refinedPrompt: RefinedPromptV1, studyPlan: StudyPlanV1 }.  
* **Data Models:** See contracts/PromptRefinementInput.schema.json, contracts/RefinedPromptV1.schema.json, contracts/StudyPlanV1.schema.json. PRS stores no data in vault; only ephemeral in memory/logs.  
* **Validation & Quality:** Validate outputs against the strict schemas; if validation fails, provide actionable repair guidance; on second failure, return error with details.  
* **Weights & Lenses:** Weights for Tutor/Publisher/Student influence the refined output; persisted in RefinedPromptV1 for audit and reproducibility.  
* **Observability & Metrics:** refinement_latency_ms, plan_size_chars, refined_text_size, weights_distribution, refinement_success_rate.  
* **Security:** refinement is ephemeral; ensure redaction for any logs; no secrets stored by PRS.  
* **Testing & Quality Assurance:** unit tests for input validation and repair logic; integration tests for /refine flow; performance tests to meet latency budgets; accessibility considerations in the refinement UI.  
* **Governance & Auditing:** All refinement events are logged with origin=refinement in the Audit log; the refinement chain is auditable and traceable to the final Proposal.  
* **UI/UX:** Two-pane interface for refining goals (Study Plan on the left, Refined Prompt on the right); controls to adjust weights, re-run refinement, and preview routing suggestions; no write actions until user approves the resulting Proposal.  

* **Rationale:** This enhancement increases data organization quality, improves prompt quality for LLM experimentation, and reduces cognitive load by pre-structuring learning goals into actionable study plans.

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

* **Description:** Approval gate writes one or more files per PROPOSAL (creation, modification, deletion, linking).  
* **Acceptance criteria:**  
  * Apply requires explicit confirmation (checkbox + modal).  
  * Writes exactly the files described in PROPOSAL; each includes frontmatter + H1 title + content.  
  * If path exists, operation aborted with actionable message unless update was explicitly approved.  
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
  * Logs clearly differentiate between **research/expansion** and **health-check initiated** changes.  
  * Justification and diff must be visible for each health check action.  
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

#### F9 — Health Checks

* **Description:** Triggered **after vault modifications**; analyze recent changes and vault structure.  
* **Acceptance criteria:**  
  * Validates linking consistency across files.  
  * Detects files becoming multi-topic and proposes splitting them into smaller, topic-aligned files.  
  * Suggests neighboring file creation if needed.  
  * Generates PROPOSALs for user approval; no direct modification of vault content.  
  * Health checks are **event-driven**: initiated only after Apply, halted if a new prompt is triggered.  
  * Logs justify all proposed changes, differentiating them from research actions.  

---

## 4. Non-Functional Requirements

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

## 5. Prioritization

### MoSCoW

#### Must

* F0 Prompt Refinement  
* F1 Prompt→PROPOSAL  
* F2 PROPOSAL Validator  
* F3 Apply (multi-file safe)  
* F4 Inventory & Reindex  
* F5 Audit Log  
* F8 Edit/Enhancement  
* F9 Health Checks  
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

---

## 6. Risks & Open Questions

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
* Health-check thresholds (e.g., definition of multi-topic).  

---

## 7. Appendices

### A. PROPOSAL Contract (Enforced)

* All output follows strict PROPOSAL format.  
* If YAML cannot resolve routing: PROPOSAL includes snippet and justification.  

### B. ISO/IEC 25010 Mapping (Selected)

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

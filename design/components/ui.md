# UI (Next.js/React)

## Purpose & Responsibilities

Provide an accessible, local-first web interface that orchestrates the end-to-end KMV Console flows with clarity, predictability, and auditability.

Responsibilities

- Facilitate the core journeys: Refinement → Proposal → Approve/Reject → Apply → Health Checks → Audit.
- Enforce schema-first interactions: validate inputs/outputs; never improvise structure.
- Surface deterministic validation outcomes with actionable remediation.
- Preserve user control with explicit approvals and visible diffs.
- Maintain performance and accessibility targets; emit UX telemetry and logs.

Non‑Responsibilities

- Direct file writes outside Apply flow.
- Git operations or multi-user collaboration.
- Provider-specific UI beyond generic settings and test call.

## Primary User Journeys & Personas

Persona: Single User (Researcher/Owner)

Journeys

1. Prompt Refinement (optional but recommended)

- Goal: transform a learning goal into a StudyPlanV1 and a high-quality refined prompt.
- Success: outputs validate; refined prompt ready for Proposal.

1. Proposal Creation

- Goal: generate a ProposalV1 from `prompt` or `refined_text` and context.
- Success: valid ProposalV1 rendered with route match status and diffs.

1. Approval & Apply

- Goal: approve a Proposal and write changes atomically.
- Success: Apply receipts returned; post-Apply validation passes.

1. Health Checks (post-Apply)

- Goal: detect structural risks (broken links, sprawl) and propose corrections.
- Success: health proposals available for review; user can approve/reject.

1. Audit & Settings

- Goal: inspect chain of actions and manage providers.
- Success: clear lineage, provider test succeeds, secrets never displayed.

## Screen-by-Screen Specifications

Note: Components listed with purpose, key props, states, events. All component names are indicative and may be mapped to your design system.

1. Prompt Refinement

Purpose: Allow the user to input a learning goal, adjust lens weights, and obtain StudyPlanV1 + RefinedPromptV1.

Key Components

- PromptPane
  - Props: value (string), minLength=8, maxLength=4000
  - State: inputText, isValid
  - Events: onChange, onSubmit
- WeightsControl (sliders for tutor/publisher/student)
  - Props: weights {tutor, publisher, student} ∈ [0,1]
  - Events: onChange(weights)
- ContextRefsInput (chips)
  - Props: items: string[], max=8
  - Events: onAdd, onRemove
- StudyPlanView (tree/table of Parts → Chapters → Modules)
  - Props: studyPlan?: StudyPlanV1; loading; error
- RefinedPromptView (monospace panel)
  - Props: refinedPrompt?: RefinedPromptV1; loading; error
- ActionsBar
  - Buttons: Refine, Reset, Send to Proposal

Behavior

- Validate on submit; POST /refine.
- On success: render studyPlan, refinedPrompt; enable “Send to Proposal”.
- On error: show structured pointers; highlight fields; allow rerun.

1. Proposal Viewer & Validator

Purpose: Generate and inspect ProposalV1 from `prompt` or `refined_text`.

Key Components

- InputSourceToggle
  - Options: Prompt | Refined
- ProposalInputPane
  - Props: prompt?: string; refined_text?: string
  - Events: onSubmit → POST /proposal
- ProposalSummary
  - Props: proposal?: ProposalV1; routeMatch?: string; ok: boolean
- DiffViewer (side-by-side)
  - Props: proposal, inventoryContext
- ValidationPanel
  - Props: errors: {path, message}[]; warnings?: string[]
- ActionsBar
  - Buttons: Approve (enabled when ok), Reject

Behavior

- Normalize refinedText → refined_text for API.
- Surface route match and reasons; block Approve on invalid.
- Provide copy-to-clipboard for diagnostics on malformed output.

1. Apply Confirmation & Receipts

Purpose: Confirm irreversible writes; execute atomic Apply and display results.

Key Components

- ApplyModal
  - Props: isOpen, proposalId, summary, requiresConfirm=true
  - State: isConfirmed
  - Buttons: Confirm Apply, Cancel
- ApplyStatus
  - Props: receipts: ApplyReceipt[]; postValidateStatus; errors

Behavior

- Show explicit confirmation checkbox + modal.
- On success: list receipts; link to affected paths; show post-Apply validation summary.

1. Inventory & Reindex

Purpose: Visualize vault state and trigger scans.

Key Components

- InventoryTable
  - Props: rows {path,title,topic,status,tags}
- ReindexControls
  - Buttons: Full Scan, Incremental
  - Telemetry: files_per_sec, changed_count

1. Audit Viewer

Purpose: Inspect append-only audit chain with hash pointers.

Key Components

- AuditList
  - Props: records {ts, origin, justification, prev_hash, record_hash}
- RecordDetail
  - Props: selectedRecord with bundle map and receipts

1. Settings

Purpose: Manage provider configuration and test connectivity.

Key Components

- ProviderForm
  - Fields: model, baseURL, apiKey (masked), temperature
  - Actions: Test Call (never logs secrets)
- VaultConfig
  - Fields: vault path, time zone/locale

## Interaction & Accessibility Guidelines

General

- WCAG 2.1 AA baseline; adopt WCAG 2.2 deltas (focus appearance, target sizes, drag alternatives).
- Keyboard-first: all actions reachable via Tab/Shift+Tab; visible focus outline; skip links.
- ARIA: regions for main/aside; live regions (polite) for validation results.
- Error language: concise, specific, actionable. Example: “status must be one of [draft, in-progress, review, published, archived].”
- Loading/Empty states: skeletons; empty prompts with guidance; handle offline (disable provider calls; show offline banner).

Forms

- Inline validation with clear labels and descriptions.
- Submit disabled until minimum requirements met.
- Preserve values across navigation (autosave to in-memory store).

Tables/Lists

- Responsive layout; column visibility toggle; keyboard row navigation.

Modals

- Return focus to invoking control; Escape closes; focus trapped within modal.

Focus Order Examples

- Refinement: Goal → Weights → ContextRefs → Refine → Send to Proposal.
- Proposal: Source Toggle → Input → Validate → Approve.
- Apply: Approve → Confirm checkbox → Confirm Apply.

## Design System Mapping

Typography & Spacing

- Heading scale with 1.25 ratio; 8px baseline grid.
- Monospace for JSON panels; readable line length.

Color & States

- High-contrast palette; semantic colors for success/warning/error.

Components (suggested)

- Buttons: Primary/Secondary/Destructive; Loading states.
- Inputs: TextArea, TextField, Slider, ChipInput.
- Panels: Card, Accordion, Tabs.
- Feedback: Toasts (ARIA live polite); Inline alerts.

Icons & Affordances

- Use recognizable symbols for actions (apply, validate, copy) with labels.

## Observability & UX Metrics

Client Telemetry (non-PII)

- ui_page_load_ms, ui_form_submit_ms, ui_a11y_violations_total.
- time_to_first_valid_refinement_ms, refinement_success_rate.
- time_to_first_valid_proposal_ms, proposal_validation_errors_total.
- apply_confirmation_rate, apply_success_rate, apply_duration_ms.
- health_proposals_generated_total.

Logging (client)

- correlation_id, route, action, duration_ms, outcome.
- Redact secrets; never log payloads containing API keys.

Server Alignment

- Correlate with API metrics: refinement_latency_ms, plan_size_chars, refined_text_size, proposal_latency_ms, etc.

## Test Plan (A11y / UX / E2E)

A11y

- Axe-core scans on all primary screens; enforce zero critical violations.
- Keyboard-only navigation tests cover all actions.
- Screen-reader announcements verified for validation and apply success.

UX

- Task completion time: Refinement (≤ 10s p50, ≤ 16s p90); Proposal (≤ 10s p50, ≤ 20s p90).
- Error-state clarity tests: messages include field, expected enum/pattern.

E2E

- Refinement happy path → Proposal → Approve → Apply → Receipts.
- Validation blocks Approve on schema failure; repair loop path covered.
- Apply idempotency: preventing duplicate writes via proposal_hash.
- Offline mode behavior (provider calls disabled; UI messaging consistent).

Fixtures & Tools

- tests/fixtures for valid/invalid schemas; msw for API mocking.
- Lighthouse for performance; Axe for a11y; Playwright/Cypress for E2E.

Acceptance Criteria

- All A11y tests pass (no critical violations).
- Core flows complete within target budgets (p50/p90).
- Validation messaging meets precision and remediation standards.

## Traceability Matrix

| Requirement Ref | Screen/Section | Acceptance/Test |
| --- | --- | --- |
| requirements.md §3 F0 Prompt Refinement | Prompt Refinement | A11y + E2E Refinement → Proposal |
| requirements.md §3 F1 Prompt→PROPOSAL | Proposal Viewer & Validator | E2E Proposal creation + validation |
| requirements.md §3 F2 Validator | Proposal Viewer & Validator | Block Approve when invalid |
| requirements.md §3 F3 Apply | Apply Confirmation & Receipts | E2E Apply + receipts + idempotency |
| requirements.md §3 F4 Inventory & Reindex | Inventory | Reindex telemetry + UI |
| requirements.md §3 F5 Audit Log | Audit Viewer | List chain + details |
| requirements.md §3 F6 Settings | Settings | Provider test call UX |
| requirements.md §3 F9 Health Checks | Health Proposals (post-Apply) | Surfaced post-Apply; user can approve |
| requirements.md §4 Performance | Observability & UX Metrics | p50/p90 asserted via tests |
| system-design.md §2.3 Refinement | Prompt Refinement | refined_text handoff to Proposal |
| system-design.md §2.3 Proposal | Proposal Viewer | Proposal schema + hashing communicated |

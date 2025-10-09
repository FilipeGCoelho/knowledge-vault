# UI Architecture

Information Architecture

- Routes
  - /refine — Prompt Refinement
  - /proposal — Proposal Viewer & Validator
  - /apply (modal) — Apply confirmation
  - /inventory — Inventory & reindex
  - /audit — Audit log
  - /settings — Provider & vault settings
- Navigation model
  - Global header with Home/Refinement/Proposal; secondary nav (tabs or left-nav) for deeper areas.
  - Depth ≤ 3; primary actions per screen emphasized.
- Responsive
  - Breakpoints: 1280 / 960 / 600 px; stack panels vertically on narrow viewports.

Page Templates

- Two-pane (Refinement): form + results (StudyPlan, RefinedPrompt)
- Single-pane with summary (Proposal): input + summary + diff (future)
- Modal confirmation (Apply)

Traceability

| Requirement | System Design | UI Doc |
| --- | --- | --- |
| requirements.md §3 F0 | system-design.md §2.3 Refinement | components/Refinement.md |
| requirements.md §3 F1 | system-design.md §2.3 Proposal | components/Proposal.md |
| requirements.md §3 F3 | system-design.md §2.3 Apply | components/Apply.md |
| requirements.md §3 F4 | system-design.md §2.3 Inventory | components/Inventory.md |
| requirements.md §3 F5 | system-design.md §2.3 Audit | components/Audit.md |
| requirements.md §3 F6 | system-design.md §2.3 Settings | components/Settings.md |

Diagrams

- See docs/img/architecture.svg, docs/img/flow.svg, docs/img/state.svg.

Last Updated: 2025-10-09

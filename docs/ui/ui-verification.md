# UI Verification

A11y

- Axe-core: zero critical violations on all primary screens.
- Keyboard: Tab/Shift+Tab coverage for actions; focus-visible; Escape closes modals.
- Screen-reader: ARIA live announcements for validation/apply success.

UX Budgets

- Refinement completion: ≤ 10s p50, ≤ 16s p90.
- Proposal completion: ≤ 10s p50, ≤ 20s p90.

E2E Flows

- Refinement → Proposal → Approve → Apply → Receipts (happy path).
- Validation blocks Approve when invalid; repair loop path covered.
- Offline mode messaging when provider disabled.

Acceptance Criteria

- A11y: pass thresholds.
- Performance budgets met.
- Validation messaging specific and actionable.

Last Updated: 2025-10-09

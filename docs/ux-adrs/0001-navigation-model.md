# ADR-0001 Navigation Model

- Status: Accepted
- Date: 2025-10-09

Context

We need a predictable navigation model spanning Refinement, Proposal, Apply, Inventory, Audit, and Settings with depth constraints and consistent responsive behavior.

Decision

- Three-tier model: Global header, primary area nav (tabs or left-nav), in-page anchors where needed.
- Depth ≤ 3; primary actions are emphasized per screen.
- Breakpoints at 1280/960/600 px; panels stack on narrow viewports.

Consequences

- Predictable wayfinding and focus order across screens.
- Simplified a11y testing; lower cognitive load for users.

Verification

- A11y/UX tests confirm navigation order and visibility at all breakpoints.
- Heuristic review and user walkthroughs on key flows.

Related

- docs/ui/ui-architecture.md
- docs/ui/ui-principles.md

Last Updated: 2025-10-09

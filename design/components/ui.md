# UI (Next.js/React) — Design Drafts (Non‑Normative)

Status & Scope

- This document is a working draft area for ideation and in‑progress notes.
- All authoritative (normative) UI documentation now lives under `docs/ui/`.
- Contracts, payloads, and endpoint paths remain unchanged. The canonical key for refinement weights is `weights`.

Quick Links (Authoritative)

- Principles: [docs/ui/ui-principles.md](../../docs/ui/ui-principles.md)
- Architecture & IA: [docs/ui/ui-architecture.md](../../docs/ui/ui-architecture.md)
- Implementation (App Router, SSR/CSR policy, API, env): [docs/ui/ui-implementation.md](../../docs/ui/ui-implementation.md)
- Observability (UX metrics, events): [docs/ui/ui-observability.md](../../docs/ui/ui-observability.md)
- Verification (A11y/UX/E2E, budgets): [docs/ui/ui-verification.md](../../docs/ui/ui-verification.md)
- Security (CSP, CSRF, secrets): [docs/ui/ui-security.md](../../docs/ui/ui-security.md)
- Components:
  - Refinement: [docs/ui/components/Refinement.md](../../docs/ui/components/Refinement.md)
  - Proposal: [docs/ui/components/Proposal.md](../../docs/ui/components/Proposal.md)
  - (Future) Apply, Inventory, Audit, Settings → to be added under [docs/ui/components/](../../docs/ui/components/)

Current Decisions (See ADRs)

- ADR‑0001 Navigation Model (Accepted): three‑tier nav, depth ≤ 3, breakpoints 1280/960/600.  
  [docs/ux-adrs/0001-navigation-model.md](../../docs/ux-adrs/0001-navigation-model.md)
- ADR‑0002 Client‑only Policy for Interactive Panes (Accepted): `next/dynamic(..., { ssr: false })` with hydration mitigations.  
  [docs/ux-adrs/0002-client-only-policy.md](../../docs/ux-adrs/0002-client-only-policy.md)

Authoring Notes

- Use this file for early sketches and notes; migrate finalized content into [docs/ui/*](../../docs/ui/).
- Research assets live under `design/research/ui/ideation-dataset/` and may be referenced from [docs/ui/ui-principles.md](../../docs/ui/ui-principles.md) as non‑normative examples.
- Keep schema references aligned: PromptRefinementInput uses `{ goal, contextRefs?, weights? }`; Proposal uses `{ prompt? | refined_text? }`.

Last Updated: 2025-10-09

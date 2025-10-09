# ADR-0002 Client-only Policy for Interactive Panes

- Status: Accepted
- Date: 2025-10-09

Context

Hydration mismatches can occur due to browser extensions and non-deterministic client state. Our Refinement and Proposal panes are interactive and dynamic.

Decision

- Load Refinement and Proposal panes client-only using `next/dynamic(..., { ssr: false })`.
- Apply hydration mitigations: `suppressHydrationWarning` at roots; disable input autocomplete/corrections; respect reduced motion.

Consequences

- Avoids hydration drift and reduces false error reports.
- Slight delay on initial render for those sections; acceptable given benefits.

Verification

- No hydration warnings in dev with common extensions enabled.
- E2E confirms functional parity with SSR alternatives.

Related

- docs/ui/ui-implementation.md
- docs/ui/ui-principles.md

Last Updated: 2025-10-09

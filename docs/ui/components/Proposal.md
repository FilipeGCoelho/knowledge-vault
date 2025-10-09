# Component: Proposal

Purpose

Generate and display ProposalV1 from prompt or refined_text.

Props (TypeScript)

- onGenerate: (input: { prompt?: string; refined_text?: string }) => Promise<{ proposal } | { error }>

States

- inputType: "prompt" | "refined"; prompt: string; refinedText: string
- loading: boolean; error: string | null; proposal?: ProposalV1

Events

- onGenerate submit; input changes; source toggle

A11y

- Radio group for source; labeled textarea; button role; heading for output.

Patterns

- Empty: tips; Loading: skeleton; Error: schema pointers; Offline banner.

Verification

- Unit: disables Generate until input ≥ 8; renders proposal on success.
- A11y: roles/labels; keyboard activation.
- E2E: posts `{ prompt }` or `{ refined_text }` and renders ProposalV1.

Last Updated: 2025-10-09

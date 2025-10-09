# Component: Refinement

Purpose

Input a learning goal and optional context; obtain StudyPlanV1 + RefinedPromptV1.

Props (TypeScript)

- onRefine: (goal: string, contextRefs: string[], weights: Record<string, number>) => Promise<{ refinedPrompt, studyPlan } | { error }>

States

- goal: string
- contextRefs: string[]
- weights: { tutor, publisher, student }
- loading: boolean; error: string | null
- refinedPrompt?: RefinedPromptV1; studyPlan?: StudyPlanV1

Events

- onRefine submit; context add/remove; slider changes

A11y

- Labels for textarea and sliders; list semantics for refs; button role; headings for sections.
- Focus order: Goal → Weights → ContextRefs → Refine → Send to Proposal.

Patterns

- Empty: example goals; Loading: skeletons; Error: Ajv pointers; Offline banner.

Verification

- Unit: disable Refine until goal ≥ 8; renders results on success.
- A11y: role/label presence; keyboard operation.
- E2E: posts `{ goal, contextRefs, weights }` and renders results.

Last Updated: 2025-10-09

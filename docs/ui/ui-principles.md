# UI Principles

Purpose

Establish explicit principles and rules that guide all UI decisions for KMV Console: clarity, predictability, accessibility, and auditability.

Principles

- Clarity over cleverness: prefer straightforward language and layouts; avoid hidden affordances.
- Predictability: consistent patterns for inputs, validations, and errors across screens.
- Content before chrome: surface proposals, diffs, and diagnostics prominently; minimize decorative UI.
- Economy of motion: subtle transitions only (120–200 ms); no gratuitous animations.
- Accessibility by default: WCAG 2.2 AA, focus-visible, robust keyboard navigation, ARIA regions/live.
- Determinism: schema-first; unknown keys rejected; explicit errors with remediation.
- Local-first and safe: never leak secrets; privacy and redaction are defaults.

Visual Language

- Grid: 8px spacing scale; columns adapt per breakpoint.
- Type scale: 12, 14, 16, 18, 20, 24, 32, 48.
- Color roles:
  - bg, surface, text, muted, brand, info, success, warning, danger.
- Motion:
  - Durations: 120–200 ms; respect prefers-reduced-motion.
- Components use clear labels; buttons are verbs, links are nouns.

Interaction Rules

- Labels and descriptions on all fields; help text below.
- Validation: inline on blur and on submit; block primary action until valid.
- Empty states: show guidance and examples; Loading: skeletons + progress; Error: actionable and specific.
- Keyboard: Tab/Shift+Tab order mirrors visual flow; Escape closes modals; focus trap in dialogs.

Accessibility

- Baseline: WCAG 2.2 AA.
- Contrast: 4.5:1 for text, 3:1 for UI components and large text.
- Focus: use :focus-visible outlines; maintain logical order; skip-to-content link.
- Live regions: ARIA polite announcements for validation results and apply success.

Verification

- Lighthouse A11y ≥ 95.
- Axe-core violations: zero critical; low severity triaged.
- Keyboard-only tests pass all actions.

See also: ui-architecture.md, ui-verification.md, ux-adrs/0001-navigation-model.md

Last Updated: 2025-10-09

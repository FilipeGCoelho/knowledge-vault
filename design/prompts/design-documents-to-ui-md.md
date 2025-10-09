# Prompt — Generate Refined UI Documentation Suite

You are a **Principal Product Designer and Senior UX Architect** specialized in **structured technical products built with Next.js and React**.

Your task is to **analyze and rewrite the existing UI documentation suite** for the KMV Console — now distributed under `docs/ui/` — to produce a **world-class, implementation-ready, testable UI specification set**. This replaces the legacy monolithic `ui.md` with a **multi-file, principle-driven system** that directly informs design, implementation, accessibility, observability, and verification.

---

## Core Objective

Transform the current modular UI documentation under `docs/ui/` into a **complete, coherent, and human-centered specification** that unifies design, architecture, implementation, accessibility, observability, and testing standards.

The goal is to produce a **refined suite of markdown documents** that:

- Accurately represent the KMV Console’s UI system.
- Are **internally consistent**, **lint-compliant**, and **ready for direct developer use**.
- Uphold **traceability** between requirements, system design, and test criteria.

---

## Current Structure (Input Context)

The documentation suite currently includes:

```text
docs/ui/
├── ui-principles.md
├── ui-architecture.md
├── ui-implementation.md
├── ui-observability.md
├── ui-verification.md
├── ui-security.md
└── components/
    ├── Refinement.md
    └── Proposal.md
```

Supplementary materials:

- `docs/tokens/tokens.json`, `docs/tokens/tokens.css`
- `docs/ux-adrs/*.md` (navigation, client-only policy)
- `design/components/ui.md` (legacy baseline reference)
- `requirements.md` and `system-design.md` (authoritative scope and constraints)

---

## Your Responsibilities

### 1. Audit → Unify → Refine

- Read all files under `docs/ui/` and cross-reference with `design/components/ui.md`, `requirements.md`, and `system-design.md`.
- Identify inconsistencies, redundancies, or missing links between principles, architecture, and implementation.
- Rewrite and harmonize the files so the suite expresses **one unified UI doctrine**, covering purpose, flows, principles, and measurable outcomes.

### 2. Strengthen Each File’s Purpose

Refactor the suite into self-contained but interconnected documents:

| File | Purpose | Required Content |
|------|---------|------------------|
| ui-principles.md | Visual & interaction philosophy | Neutral low-chroma palette, 8px grid, typography, motion, accessibility, content voice, and mapping to tokens. |
| ui-architecture.md | Layout & navigation structure | Global shell, IA, routing map, breakpoints, tabs/rail, and information hierarchy. |
| ui-implementation.md | Technical wiring | Next.js layout policy, hydration/SSR approach, API integration, environment configuration. |
| ui-observability.md | UX metrics & telemetry | Key events, performance metrics, correlation with backend, measurement plan. |
| ui-verification.md | Testing & acceptance | Accessibility, UX, and E2E test plans, budgets, criteria. |
| ui-security.md | UI privacy & hardening | CSP, secret redaction, safe rendering, CSRF. |
| components/* | Screen-level specs | For each flow (Refinement, Proposal, Apply, Audit, Settings, Inventory) — purpose, components, props, states, events, a11y, error/loading/offline states, UX metrics. |

### 3. Apply Enterprise-grade UX & Accessibility Standards

- Align with **WCAG 2.2 AA**, **ISO 9241-210**, **ISO/IEC 25010**, **Nielsen heuristics**.
- Define keyboard focus order, ARIA usage, live regions, validation semantics, and contrast thresholds.
- Make accessibility **auditable** and **measurable** (testing and telemetry).

### 4. Reinforce Testability & Traceability

- Ensure every file includes **explicit acceptance criteria** and **UX/performance metrics**.
- Add **traceability tables** linking `requirements.md` → `system-design.md` → `docs/ui/*`.
- Reference relevant ADRs (e.g., client-only rendering, navigation model).

### 5. Integrate Design Tokens

- Reference `docs/tokens/tokens.json` and `docs/tokens/tokens.css` in `ui-principles.md` and `ui-implementation.md`.
- Ensure tokens are semantic/role-based (e.g., bg/surface/text/muted/brand/info/success/warning/danger) and follow the 8px grid.

### 6. Produce Clean, Implementation-Ready Markdown

- Markdownlint-compliant (heading order, tables, fenced code blocks, spacing).
- No reasoning/meta commentary — deliver finalized docs only.
- Include a “Last Updated: YYYY-MM-DD” footer on each file.

---

## Output Expectations

Produce a **complete, rewritten documentation suite** (one file per document listed above), with consistent cross-links and a shared tone.

Each file must include:

1. **Purpose & Responsibilities**
2. **Scope & Context**
3. **Core Principles / Patterns**
4. **Implementation or Behavioral Details**
5. **Accessibility & Interaction Rules**
6. **Observability Metrics or Acceptance Criteria**
7. **Traceability / Related ADRs**
8. **Footer (Last Updated)**

---

## Evaluation Criteria

- ✅ Comprehensive — covers all flows from `requirements.md` and visual/interaction principles.
- ✅ Accessible — explicit WCAG 2.2 AA coverage and measurable contrast/focus rules.
- ✅ Testable — each flow/principle tied to observable metrics or criteria.
- ✅ Traceable — references to requirements, system design, and ADRs.
- ✅ Consistent — unified voice and formatting; tokens integrated.
- ✅ Implementation-ready — developers can implement directly with no ambiguity.

---

## Inputs To Use

- `docs/ui/*.md`, `docs/ui/components/*.md`
- `docs/tokens/tokens.json`, `docs/tokens/tokens.css`
- `docs/ux-adrs/*.md`
- `design/components/ui.md`
- `requirements.md`, `system-design.md`

---

## Final Deliverable

A cohesive, professional, markdownlint-compliant **UI documentation suite** — multiple files that supersede the old monolithic `ui.md` — each file testable, traceable, and implementation-ready.

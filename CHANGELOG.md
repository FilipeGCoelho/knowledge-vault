# Changelog

## 0.1.1 - 2025-10-09

- UI scaffolding and best-practice hardening
  - Colocated UI panes under Next.js app: `ui/components/{RefinementPane,ProposalPane}.tsx`.
  - Next.js config cleaned: removed deprecated `experimental.appDir` and `externalDir`; `reactStrictMode: true` only.
  - Type-only imports of shared contracts from `src/contracts/types` to avoid bundling server code into UI.
  - Pages now render panes and use client-only dynamic imports (`ssr: false`) to eliminate hydration drift from browser extensions/password managers.
  - Hydration mitigations: `suppressHydrationWarning` on pane roots; disabled autocomplete/auto-correct/capitalize/spellcheck on text inputs.
- API integration and backend wiring
  - CORS enabled for `http://localhost:4000` (Next dev).
  - New `POST /proposal` endpoint (minimal) returning schema-valid `ProposalV1` for UI previews.
  - `/refine` input sanitation and key alignment: accept `{ goal, contextRefs, weights }`; map legacy `lensWeights` if present.
  - Env loading via `dotenv`: API reads `.env.local` (fallback `.env`) for `OPENAI_API_KEY`, `OPENAI_MODEL`, etc.
- Test stability and correctness
  - Vitest environment split: Node for backend tests, `happy-dom` only for `tests/ui/**` via `environmentMatchGlobs`.
  - jest-dom matcher setup fixed for ESM: namespace import and `expect.extend` in `tests/setup.ts`.
  - UI tests migrated to role-based queries to avoid ambiguous text matches.
  - Schema-compliant fixtures for Proposal/Refinement (slug-safe ids; 64-hex hashes).
- Developer experience
  - UI scripts added: `npm run ui`, `ui:build`, `ui:start` (Next 15).
  - README updated with run/test instructions.

## 0.1.0 - 2025-10-02

- Implemented Prompt Refinement Service per design.
  - Contracts enforced via Ajv (PromptRefinementInput, RefinedPromptV1, StudyPlanV1).
  - DI with LLM adapter; included MockLLMAdapter for tests.
  - Repair loop with single retry and actionable schema error feedback.
  - Observability: structured logs (pino), Prometheus metrics, correlation IDs.
  - HTTP endpoint: POST /refine with JSON I/O.
  - Tests: unit and integration with Vitest + Supertest; fixtures added.
  - CI: lint, type-check, tests, SBOM generation.
  - Docs: Updated refinement component doc with runbook & observability notes.

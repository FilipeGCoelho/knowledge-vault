# Changelog

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

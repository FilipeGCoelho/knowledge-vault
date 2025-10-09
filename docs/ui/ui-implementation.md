# UI Implementation

App Structure

- Next.js App Router under `ui/app/`
- Shared components under `ui/components/`
- API client helpers under `ui/lib/api.ts`

SSR / Hydration Policy

- Interactive panes (Refinement, Proposal) are client-only via `next/dynamic(..., { ssr: false })`.
- Hydration mitigations: `suppressHydrationWarning` at pane roots; inputs disable autocomplete/auto-correct/auto-capitalize; `spellCheck=false`.

API Integration

- Base URL: `NEXT_PUBLIC_API_BASE` (default `http://localhost:3030`).
- Endpoints:
  - POST `/refine` → `{ refinedPrompt, studyPlan }`
  - POST `/proposal` → `{ proposal }`
- CORS: API allows origin `http://localhost:4000` in dev.

Runtime Config

- UI: `ui/.env.local` defines `NEXT_PUBLIC_API_BASE`.
- API: `.env.local` (repo root) loaded via `dotenv` for `OPENAI_API_KEY`, model, base URL, temperature, etc.

Testing Environments

- Vitest `environmentMatchGlobs`: Node for backend tests; `happy-dom` for `tests/ui/**`.
- jest-dom matchers registered via namespace import; role-based queries in UI tests.

Scripts

- `npm run ui` (Next dev on 4000)
- `npm run dev` (API on 3030)
- VS Code compound launch: Dev: API + UI

Last Updated: 2025-10-09

# Architecture Decision Records (ADRs)

This folder documents key technical and architectural decisions for the KMV Console.  
Each ADR captures **context, decision, alternatives considered, and consequences**.  
The purpose is to avoid re-litigating the same questions, and to keep design choices explicit and auditable.

---

## ADR-001: UI Framework — Next.js/React

**Context**  

- The UI must render structured forms, validation errors, modals, and inventory browsers.  
- Strong ecosystem needed for accessibility (WCAG 2.1 AA), component libraries, and developer tooling.  
- The app may later become a desktop shell (Electron/Tauri), which benefits from React portability.

**Decision**  
Adopt **Next.js with React** for the UI layer.

**Alternatives Considered**  

- Vue.js: simpler learning curve but weaker ecosystem for form-heavy enterprise tooling.  
- Svelte: lightweight but less mature ecosystem.  
- Plain React (without Next.js): lacks routing & SSR out of the box, less opinionated structure.

**Consequences**  

- ✅ Rich ecosystem, easy integration with validation libraries and accessibility testing.  
- ✅ Path to Electron/Tauri reuse.  
- ❌ Slightly heavier runtime footprint compared to Vue/Svelte.  
- ❌ Learning curve if contributors are not familiar with React.

---

## ADR-002: API Layer — Node.js/Express

**Context**  

- The system requires a lightweight API layer between UI and local filesystem.  
- Needs to call external LLM APIs, validate outputs, and manage apply/audit operations.

**Decision**  
Adopt **Node.js with Express** for the API layer.

**Alternatives Considered**  

- Python FastAPI: strong schema validation, but adds dual-runtime complexity (Node + Python).  
- Go: efficient, but ecosystem mismatch with chosen UI stack and higher complexity for file adapters.

**Consequences**  

- ✅ Unified JavaScript stack (front + back).  
- ✅ Strong middleware ecosystem.  
- ❌ Less strict typing by default (TypeScript required for robustness).  

---

## ADR-003: LLM Provider Abstraction

**Context**  

- Primary provider is Gemini 2.5 Pro, but future portability to OpenAI, Anthropic, etc. is expected.  
- Avoid lock-in at service layer.

**Decision**  
Create an **LLM Adapter interface**, with Gemini as the default implementation.

**Alternatives Considered**  

- Directly coding to Gemini SDK.  
- Using a third-party wrapper (LangChain, etc.), which adds complexity and lock-in.

**Consequences**  

- ✅ Provider-agnostic design.  
- ✅ Easy swap in future without large refactors.  
- ❌ Slight overhead of maintaining adapter interface.

---

## ADR-004: Secrets Management — AES-GCM with Argon2id

**Context**  

- The system stores API keys and settings locally in `settings.json`.  
- Needs strong encryption with integrity/authentication.  
- Passphrase must be user-provided, not hardcoded.

**Decision**  
Encrypt sensitive fields with **AES-256-GCM**, key derived via **Argon2id** KDF.

**Alternatives Considered**  

- ChaCha20-Poly1305: good option, but AES-GCM has wider library support in Node.  
- PBKDF2: weaker against GPU attacks compared to Argon2id.  
- No encryption: rejected (too risky, even for local apps).

**Consequences**  

- ✅ Strong protection of API keys at rest.  
- ✅ Integrity/authentication via GCM tag.  
- ❌ Requires passphrase management UI/flow.  
- ❌ Slight performance cost for Argon2id derivation.

---

## ADR-005: Audit Log — JSONL with Hash Chaining

**Context**  

- All actions must be auditable and tamper-evident.  
- Needs to be lightweight, append-only, and human-inspectable.

**Decision**  
Store audit log in **JSONL format** with **hash chaining** between entries.

**Alternatives Considered**  

- SQLite DB: heavier, introduces schema migrations.  
- Git-based history: out of scope (Git excluded).  
- Plain text logs: no tamper evidence.

**Consequences**  

- ✅ Append-only, easy to export/verify.  
- ✅ Tamper-evidence without requiring external DB.  
- ❌ Limited query capabilities (no complex search without external tooling).  

---

## ADR-006: File System Writes — Local-First, Atomic, No Git

**Context**  

- Scope excludes Git integration for now.  
- Reliability requires no partial writes and no silent overwrites.

**Decision**  
Implement **atomic writes with temp+rename** inside the vault.  
Restrict writes to Apply-only flow.  
Skip Git for MVP.

**Alternatives Considered**  

- Git staging/commits: adds complexity, out of scope.  
- Direct writes without atomicity: unsafe.

**Consequences**  

- ✅ Simpler, reliable, local-only design.  
- ✅ Matches MVP scope.  
- ❌ No version history beyond audit/undo buffer.  
- ❌ Users wanting Git history must add it manually.  

---

## ADR-007: Undo Model — Limited (Last 3 Actions)

**Context**  

- The system must support rolling back mistakes, but without full versioning overhead.  
- Undo is a usability requirement, not a full VCS.

**Decision**  
Provide **undo log** with maximum 3 reversible actions (`APPLY_CREATE`, `ENHANCEMENT_APPLY`, `SETTINGS_UPDATE`).

**Alternatives Considered**  

- Infinite undo via Git or DB.  
- No undo at all.

**Consequences**  

- ✅ Simple, bounded complexity.  
- ✅ Covers user error in the short term.  
- ❌ No long-term rollback beyond audit trail.  

---

## ADR-008: Offline Mode — Reads OK, No Queueing

**Context**  

- App must function offline for vault browsing.  
- LLM calls require internet; queueing would complicate UX/state management.

**Decision**  
Support **offline reads/writes**, but **no prompt queueing** for offline LLM usage.

**Alternatives Considered**  

- Queue prompts and auto-send when back online (complex).  
- Hard-fail everything when offline.

**Consequences**  

- ✅ Simple, predictable UX.  
- ✅ No hidden state or retries.  
- ❌ User must retry manually once online.  

---

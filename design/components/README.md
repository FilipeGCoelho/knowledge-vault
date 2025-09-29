# Component Documentation

Purpose

Central location for implementation-ready documentation for each component/service and adapter. Use these docs before writing code to confirm contracts, acceptance criteria, risks, and test plans.

How to use

- Start with the `_template.md` to add new components.
- Each component doc includes responsibilities, inputs/outputs, interfaces, failure modes, observability, security, acceptance criteria, and a ready-to-implement checklist.
- Cross-reference `design/system-design.md` and `design/requirements.md` for authoritative context.

Index

- Services
  - [Prompt Refinement](./refinement.md)
  - [Proposal](./proposal.md)
  - [Validation](./validation.md)
  - [Apply](./apply.md)
  - [Inventory](./inventory.md)
  - [Health Check Orchestrator](./health-check-orchestrator.md)
  - [Audit](./audit.md)
  - [Settings](./settings.md)
- Adapters
  - [Filesystem Adapter](./adapters/fs.md)
  - [LLM Adapter](./adapters/llm.md)
  - [Crypto/KeyStore Adapter](./adapters/crypto.md)
- Platform
  - [API (HTTP)](./api.md)
  - [UI](./ui.md)

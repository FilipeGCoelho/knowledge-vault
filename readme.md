# KMV Console

_Local-first LLM-assisted research console with governed Markdown vaults, strict YAML routing, atomic writes, and immutable audit logs._


## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Features](#features)
- [Architecture (at a glance)](#architecture-at-a-glance)
- [Performance & Quality Targets](#performance--quality-targets)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Install](#install)
  - [First Run](#first-run)

## Overview

**KMV Console** is a **single-user, local-first** web app that helps you:

- Research with LLM assistance,
- Generate **governed** Markdown notes (frontmatter + content),
- Enforce structure with `routing.yaml` as the **single source of truth (SSOT)**,
- Apply changes **atomically** and keep an **immutable audit log**,
- Maintain a vault **inventory** with near-duplicate detection.

> Workflow: **Research → PROPOSAL → Approve/Reject → Apply**.  
> Only approved PROPOSALs can write to disk. No arbitrary edits.


## Core Concepts

- **Vault**: Master folder with Markdown notes, `routing.yaml`, `vault.json`, `audit.log`, `settings.json`.
- **PROPOSAL**: Strict, schema-validated suggestion for a new/updated note (never improvisational).
- **Apply**: Atomic write of exactly one file based on an approved PROPOSAL.
- **Inventory**: `vault.json` index (path/title/topic/status/tags/mtime/size/hash).
- **Audit**: Append-only JSON Lines log with hash chaining for tamper evidence.


## Features

- ✅ **Strict governance** via `routing.yaml` (no write if rules aren’t met)
- ✅ **Schema validation** of PROPOSALs with a format-repair loop (≤ 2 attempts)
- ✅ **Atomic, idempotent writes** (temp+rename; proposal-hash based)
- ✅ **Undo last 3 actions** (delete/restore/swap primitives; safety-checked by content hash)
- ✅ **Fast inventory & duplicate detection** (reindex full ≤ 30s @ 5k files; incremental ≤ 5s)
- ✅ **Immutable audit log** (JSONL + hash chain; export/verify)
- ✅ **Security**: AES-256-GCM for secrets; Argon2id KDF; no plaintext logging
- ✅ **Accessibility**: WCAG 2.1 AA intentions (live regions, focus management, contrast)
- ✅ **Provider-agnostic LLM** (Gemini 2.5 Pro by default; adapter pattern)


## Architecture (at a glance)

- **UI (Next.js/React)**: Prompt form, PROPOSAL viewer/validator, Apply gate, Inventory, Settings.
- **API (Node/Express)**:
  - Proposal Service → LLM → `ProposalV1`
  - Validation Service → `ValidationReport`
  - Apply Service → atomic write + idempotency + undo buffer
  - Inventory Service → `vault.json` full/incremental
  - Audit Service → JSONL append + chain
  - Settings Service → encrypted config
- **Adapters**: LLM Adapter, FS Adapter (safe I/O), Crypto/KeyStore.
- **Data**: Markdown files, `routing.yaml`, `vault.json`, `audit.log`, `settings.json`, `undo.log`.


## Performance & Quality Targets

- **Prompt → PROPOSAL**: p50 ≤ **10s**, p90 ≤ **20s** (LLM live)
- **Apply**: ≤ **1s** per file (≤ 64 KB typical)
- **Reindex**: full ≤ **30s** @ 5k files; incremental ≤ **5s**
- **Consistency**: 100% notes conform to `routing.yaml`
- **Quality**: ≤ **1%** rejected writes due to schema violations
- **Safety**: 0 critical incidents of structure drift/unauthorized writes


## Getting Started

### Prerequisites

- **Node.js**: v18+ (LTS recommended)
- Local filesystem access to a **vault** folder

### Install

```bash
# clone
git clone <your-repo-url> kmv-console
cd kmv-console

# install dependencies
npm install
```

### First Run

```bash
# development server
npm run dev
```

On first launch you will:

1. Choose a vault path (folder will be used/read).
2. Set an encryption passphrase (for secrets).
3. Provide an LLM API key (Gemini by default).
4. Offline behavior: reads/writes OK; LLM calls will be blocked with a clear “LLM offline” state (no queue)

---

## Example Contract Payloads

Below are example payloads for key service contracts. These help developers understand expected request/response formats and support schema validation:

### ProposalV1

```json
{
  "title": "Add new research note",
  "path": "notes/2025-09-25-llm-research.md",
  "topic": "LLM Research",
  "tags": ["llm", "research"],
  "status": "draft",
  "content": "---\ntitle: LLM Research\ntags: [llm, research]\n---\n...note body..."
}
```

### ValidationReport

```json
{
  "proposalPath": "notes/2025-09-25-llm-research.md",
  "valid": true,
  "errors": []
}
```

### ApplyReceipt

```json
{
  "applied": true,
  "hash": "abc123...",
  "timestamp": "2025-09-25T12:34:56Z"
}
```

### AuditRecord

```json
{
  "action": "APPLY_CREATE",
  "user": "filipe-coelho",
  "timestamp": "2025-09-25T12:34:56Z",
  "hash": "abc123...",
  "prevHash": "def456..."
}
```

---

## Update Policy & Documentation Sync

Whenever contracts, routing.yaml, or business logic change, update the README, design docs (ADRs, requirements, system-design), and contract schemas in lockstep. This ensures:

- Developer onboarding remains frictionless
- Schema validation is always up to date
- Governance and auditability are preserved

> **Note:** The SSOT (`routing.yaml`) governs all structure and validation. Any drift between documentation, contracts, and implementation must be resolved immediately.

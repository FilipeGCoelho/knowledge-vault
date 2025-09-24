# KMV Console — System Design (Revised, Implementation-Ready)

> Scope: Single-user, local-first, Git-less, governed by `routing.yaml`. Write operations only via approved PROPOSALs. Undo up to 3 steps. Offline reads/writes; LLM calls may block.

---

## 1. Context View

### 1.1 Actors

- **User (Researcher/Owner)** — prompts, reviews PROPOSALs, approves, applies, audits.
- **LLM Provider** — Gemini 2.5 Pro (adapter is provider-agnostic).
- **Local Filesystem (Vault)** — master folder with Markdown files, `routing.yaml`, `vault.json`, `audit.log`, `settings.json`.

### 1.2 System Purpose

- Convert prompts into **PROPOSALs** that comply with `routing.yaml`.
- Validate, approve, and **atomically apply** files with auditable history.
- Maintain **inventory** and **immutable audit** without Git.

---

## 2. Container View

### 2.1 UI (Next.js/React)

- Prompt form, PROPOSAL viewer/validator, Apply gate, Inventory browser, Settings.
- Enforces UI blocks (no writes without approval; only one enhancement at a time).
- Accessibility (WCAG 2.1 AA): live regions for errors, focus management, visible focus.

### 2.2 API (Node/Express)

- **Proposal Service** — LLM call → strict `ProposalV1`.
- **Validation Service** — `ProposalV1` × `routing.yaml` × `vault.json` → `ValidationReport`.
- **Apply Service** — atomic write, idempotent per `proposal_hash`, updates undo buffer.
- **Inventory Service** — fast reindex (full ≤30s @5k files, incremental ≤5s).
- **Audit Service** — append-only JSONL entries with hash chain.
- **Settings Service** — encrypted settings, provider test.

### 2.3 Adapters

- **LLM Adapter**
- **FS Adapter** (temp+rename, path normalization, symlink guard)
- **Crypto/KeyStore Adapter** (AES-GCM; Argon2id KDF)

### 2.4 Data Stores

- `routing.yaml`
- `vault.json`
- Markdown files
- `audit.log` (JSONL)
- `settings.json` (encrypted fields)
- `undo.log` (last 3 reversible actions)

---

## 3. Component View

### 3.1 Contracts

#### 3.1.1 ProposalV1

```json
{
  "$id": "ProposalV1.schema.json",
  "type": "object",
  "required": ["version","id","target","frontmatter","body","governance","hash"],
  "properties": {
    "version": { "const": 1 },
    "id": { "type": "string", "minLength": 8 },
    "target": {
      "type": "object",
      "required": ["route_id","path"],
      "properties": {
        "route_id": { "type": "string" },
        "path": { "type": "string", "pattern": "^[^\\0]*\\.md$" }
      }
    },
    "frontmatter": {
      "type": "object",
      "required": ["title","status"],
      "properties": {
        "title": { "type": "string", "minLength": 3 },
        "status": { "type": "string", "enum": ["draft","in-progress","review","published","archived"] },
        "tags": { "type": "array", "items": { "type": "string" } }
      }
    },
    "body": {
      "type": "object",
      "required": ["content_md"],
      "properties": {
        "content_md": { "type": "string" }
      }
    },
    "governance": {
      "type": "object",
      "required": ["related_links","rationale"],
      "properties": {
        "related_links": { "type": "array", "items": { "type": "string" } },
        "rationale": { "type": "string" }
      }
    },
    "hash": { "type": "string", "pattern": "^[a-f0-9]{64}$" }
  },
  "additionalProperties": false
}
```

#### 3.1.2 ValidationReport

```json
{
  "$id": "ValidationReport.schema.json",
  "type": "object",
  "required": ["ok","errors","matched_route_id"],
  "properties": {
    "ok": { "type": "boolean" },
    "matched_route_id": { "type": "string" },
    "errors": {
      "type": "array",
      "items": { "type": "object",
        "required": ["code","path","message","severity"],
        "properties": {
          "code": { "type": "string" },
          "path": { "type": "string" },
          "message": { "type": "string" },
          "severity": { "type": "string", "enum": ["error","warning"] },
          "ruleId": { "type": "string" }
        }
      }
    }
  }
}
```

#### 3.1.3 ApplyReceipt

```json
{
  "path": "research/2025/topic-x.md",
  "proposal_hash": "a1b2...64",
  "written_at": "2025-09-24T14:05:03Z",
  "bytes": 1234,
  "content_hash": "deadbeef...64"
}
```

#### 3.1.4 AuditRecord

```json
{
  "ts": "2025-09-24T14:05:03Z",
  "action": "APPLY",
  "user": "local",
  "proposal_id": "prop-...",
  "proposal_hash": "a1b2...64",
  "path": "research/2025/topic-x.md",
  "result": "SUCCESS",
  "prev_record_hash": "Hn-1",
  "record_hash": "Hn"
}
```

#### 3.1.5 vault.json

```json
{ 
    "path":".../topic-x.md",
    "title":"...",
    "topic":"...",
    "status":"draft",
    "tags":["a"],
    "mtime":1695555555,
    "size":1234,
    "content_hash":"...64" 
}
```

### 3.2 Services (IO, Behavior, Failure)

#### 3.2.1 Proposal Service

- **In:** `{ prompt, contextRefs? }`
- **Out:** `ProposalV1`
- **Flow:** LLM call → parse → **repair loop** (≤ 2 attempts within p90) → compute `hash`.
- **Failure:** `LLM_TIMEOUT` | `LLM_429` | `LLM_MALFORMED` (with retryable flags).
- **Note:** If routing is unresolved, include `routing_yaml_snippet` in `governance.rationale`.

#### 3.2.2 Validation Service

- **In:** `ProposalV1`, `routing.yaml`, `vault.json`
- **Out:** `ValidationReport`
- **Checks:** JSON Schema; route match; path policy; status ∈ allowed; related link existence.
- **Blockers:** Any `severity=error` ⇒ **approval disabled**.

#### 3.2.3 Apply Service

- **In:** **Approved** `ProposalV1`
- **Out:** `ApplyReceipt`
- **Behavior:** Idempotency by `proposal_hash`; **atomic write** (see §5); update `undo.log`.
- **Failure:** No partial writes; explicit actionable message (`PATH_COLLISION`, `FS_NO_SPACE`).

#### 3.2.4 Inventory Service

- **Full scan:** ≤ 30s @ 5k files (frontmatter-only parse); saves `vault.json`.
- **Incremental:** File watcher and/or `mtime|size`; ≤ 5s; re-hash **only changed** files.
- **Near-duplicates:** cosine(title n-grams) + slug Levenshtein; threshold **≥ 0.82** & **same topic**.

#### 3.2.5 Audit Service

- **Append JSONL**; compute hash chain; `fsync` after append.
- **Export:** CSV/JSON (by replaying JSONL).
- **Verify:** Recompute chain end-to-end.

#### 3.2.6 Settings Service

- **Security:** Encrypted fields in `settings.json` using **AES-GCM**; key derived with **Argon2id** from user passphrase.
- **Ops:** Test provider call with **redacted logging**.

---

## 4. Operational View

### Core Sequence

1. **Prompt** → Proposal Service (LLM → `ProposalV1` with `hash`).
2. **Validation** → `ValidationReport` (UI shows errors/warnings + matched route).
3. **Approve** → Apply Service acquires locks, performs **atomic write**, updates inventory (incremental), appends audit.
4. **Enhancement flow** → same path but **body-only** mutation (frontmatter untouched).

### Offline Behavior

- **Reads:** Always OK.
- **LLM unavailable:** Show “LLM offline” state; **queue not supported** (keep it simple).

---

## 5. File Safety: Atomic Write & Locking

### Atomic Write (temp + rename)

1. Resolve **normalized absolute path** inside vault; **reject** path traversal/symlinks.
2. Write to `vault/.tmp/<uuid>.md`; `fsync(file)`.
3. `fsync(vault/.tmp)`; `rename(tmp → final)` (atomic on same device).
4. `fsync(parent_dir)`.
5. On error: **remove temp**; return error; **no partials**.

### Locking

- **Per-path lock:** `vault/.locks/<sha256(path)>.lock` (create with `O_EXCL`).
- **Inventory lock:** `vault/.locks/inventory.lock` during full reindex.
- **Crash cleanup:** Stale locks **older than 10 minutes** are reclaimable.

### Idempotency

- If a previous **Apply** exists for the same `proposal_hash` and `path` with the same `content_hash` → **return prior receipt** (no rewrite).

---

## 6. Undo Model (max 3 steps)

### Undoable Actions

- `APPLY_CREATE` (new file) → **inverse:** delete file (only if unchanged; verify `content_hash`).
- `ENHANCEMENT_APPLY` (body update) → **inverse:** restore previous content (snapshot saved).
- `SETTINGS_UPDATE` → **inverse:** restore previous settings.

### Persistence

- `undo.log` (JSONL): `{ action, inverse_payload, content_hash, ttl_index }`.
- **Eviction:** Remove oldest when > 3 entries.
- **Safety:** Before undo, verify file state matches `content_hash`.

---

## 7. Error Taxonomy (codes, purpose, retry)

| Code              | Class        | Retry?   | Typical cause           | UI remediation                           |
|-------------------|--------------|----------|-------------------------|-------------------------------------------|
| `SCHEMA_INVALID`  | USER_INPUT   | No       | Proposal violates schema| Show failing paths; offer repair          |
| `ROUTING_MISMATCH`| USER_INPUT   | No       | No route matches        | Propose YAML snippet                      |
| `PATH_COLLISION`  | USER_INPUT   | No       | Target exists           | Suggest new slug                          |
| `FS_NO_SPACE`     | SYSTEM       | No       | Disk full               | Free space; retry                         |
| `FS_PERMISSION`   | SYSTEM       | No       | No write perms          | Fix permissions                           |
| `CONFIG_CORRUPT`  | SYSTEM       | No       | Bad settings/routing    | Open settings / recover                   |
| `LLM_TIMEOUT`     | PROVIDER     | Yes      | Network/latency         | Retry with backoff                        |
| `LLM_429`         | PROVIDER     | Yes      | Rate limit              | Backoff & retry                           |
| `LLM_MALFORMED`   | PROVIDER     | Yes (≤2) | Bad output              | Repair loop; if fail, show raw            |

---

## 8. Security & Secrets

- `settings.json` stores encrypted fields:

  ```json
  { 
    "provider": "...",
    "api_key": "enc:base64",
    "kdf": { "alg": "Argon2id", "salt": "...", "params": { "m": ..., "t": ..., "p": ... } }
  }
    ```

### Security & Secrets

- **Cipher:** AES-256-GCM; random 12-byte nonce; store auth tag.  
- **Passphrase:** Set by user on first run; rotation flow re-encrypts.  
- **Logging:** Never log secrets or plaintext settings. Redact in UI/logs.  
- **Filesystem permissions:** Restrict app directory to user.  

---

## 9. Inventory & Duplicate Detection

- **Index fields:** `path, title, topic, status, tags, mtime, size, content_hash`.

### Incremental Strategy

- On change events or periodic scan: compare `mtime | size`; if changed → parse frontmatter → recompute `content_hash` if necessary.  
- Keep last scan stats; avoid full content parse when unchanged.

### Near-Duplicate

- Compute `title_vector` via n-gram TF-IDF; keep in-memory vector index.  
- Candidate selection by topic equality; compute cosine similarity + slug Levenshtein.  
- Flag if `cosine ≥ 0.82` **and** topic equal.  

---

## 10. LLM Output Repair Loop

- **Max 2 repairs** within overall **p90 ≤ 20s**.  
- **Repairs allowed:** add missing required keys with placeholders; remove unknown keys; normalize enums; path slugify.  
- **Validation:** Always validate after each repair; include repair notes in `governance.rationale`.  
- **Audit:** Record original and final hashes.  

---

## 11. Observability

### SLIs

- Prompt → Proposal latency (p50/p90)  
- Apply success rate  
- Validation failure rate (system-caused vs user-caused)  
- Reindex throughput (files/sec)  

### Structured Logs (JSON)

- Include: `ts, correlation_id, proposal_id, proposal_hash, action, code, outcome`.  

### Diagnostics

- “Export diagnostics” bundle: `routing.yaml`, `settings` (**redacted**), `audit.log` (optionally truncated), last `vault.json`.  

---

## 12. Performance & Test Plan (Shift-Left)

### Performance Targets

- Prompt → Proposal: **p50 ≤ 10s**, **p90 ≤ 20s** (LLM live); mock LLM for CI.  
- Apply: **≤ 1s** per file (≤ 64 KB typical Markdown).  
- Reindex: **full ≤ 30s** @ 5k files; **incremental ≤ 5s**.  

### Tests

- **Contract tests:** Schemas with canonical valid/invalid fixtures.  
- **Property tests:** Apply idempotency; atomic write crash simulation (temp removal).  
- **Error-path tests:** Each error code triggers correct UI remediation.  
- **Perf harness:** Synthetic prompts to assert latency budgets.  
- **Accessibility:** Automated checks + screen-reader smoke (live region announcements).  
- **Audit verifier:** CLI recomputes chain on `audit.log`.  

---

## 13. Diagrams (Mermaid — optional)

Keep simple; add later if needed for onboarding.

- Context/Container  
- Sequence: Prompt → Proposal → Validation → Approve → Apply → Audit → Reindex  
- State machine: Proposal (Draft → Validated → Approved → Applied / Rejected)  

---

## 14. Open Items (Consciously Deferred, Minimal Viable)

- **Desktop shell** (Electron/Tauri) vs local web server: choose later; affects file picker & secret storage location only.  
- **Queued offline prompts:** Not supported (keep simple; clear offline state instead).  
- **Vault scale > 5k:** Acceptable for now; if exceeded, shard `vault.json` or add lightweight DB.  

---

## 15. Compliance with Requirements (Trace Highlights)

- **Strict governance** (`routing.yaml`) → Validation blocks; PROPOSAL repair loop with constraints.  
- **Idempotent & atomic** applies → §5.  
- **Undo (3 steps)** → §6.  
- **Audit immutability** → §3.2 Audit Service, §11 tests.  
- **Performance targets** → §12 budgets + harness.  
- **Security of secrets** → §8.  
- **Enhancements body-only** → §4 flow; validator ensures frontmatter untouched.  

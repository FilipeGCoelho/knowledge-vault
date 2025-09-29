# Filesystem Adapter

Purpose & Responsibilities

Provide safe path normalization, locking, atomic writes (tmp → fsync → rename → parent fsync), and inventory utilities.

Interfaces

- Exposed methods: readFile, writeAtomic, exists, list, lock(path), unlock(path).
- Deny traversal and symlinks; ensure same-device renames.

Failure Modes & Error Codes

- FS_NO_SPACE, FS_PERMISSION, PATH_TRAVERSAL, SYMLINK_REJECTED, CROSS_DEVICE_RENAME.

Observability

- Metrics: fsync_durations_ms, write_latency_ms, lock_acquire_ms.
- Logs: path (normalized), operation, outcome.

Security Considerations

- Reject symlinks; normalize to absolute within vault; no NUL bytes; UTF-8 only.

Acceptance Criteria

- Atomicity guaranteed on same device; lock reclaim policy; deterministic behavior.

Test Plan

- Chaos: kill between write and rename; simulate cross-device; permission errors.
- Property: replays and idempotency at Apply layer.

Ready-to-Implement Checklist

- [ ] Temp directory policy.
- [ ] Lock file scheme and TTL.
- [ ] Error mapping and messages.
- [ ] Tests and harness ready.

---

## End-to-end Information Flow (writeAtomic)

1. Normalize and validate path
   - Absolute within vault; reject `..`, NUL, non-UTF-8, and symlinks.

2. Write temp file
   - Write to `vault/.tmp/<uuid>`; `fsync(file)`; `fsync(tmp_dir)`.

3. Rename and sync
   - POSIX `rename(tmp→final)` (same device); `fsync(parent_dir)`.

4. Release resources
   - Close descriptors; cleanup temps; return stats.

## Deterministic Algorithm (Step-by-step)

- Locking
  - Create lock `vault/.locks/<sha256(path)>.lock` using `O_EXCL` before writes; enforce TTL reclaim rule.
- Cross-device detection
  - Compare device ids; if different, error with `CROSS_DEVICE_RENAME`.
- Normalization
  - Resolve symlinks and reject if any part is a symlink.

## Examples (pseudo-code)

```ts
await fsAdapter.lock(path)
try {
  const tmp = await fsAdapter.writeTemp(content)
  await fsAdapter.fsync(tmp)
  await fsAdapter.fsync(tmpDir)
  await fsAdapter.rename(tmp, final)
  await fsAdapter.fsync(parentDir)
} finally {
  await fsAdapter.unlock(path)
}
```

## Observability (expanded)

- Metrics
  - `fs_write_atomic_ms`, `fs_rename_ms`, `fs_lock_wait_ms`
- Logs
  - `path_normalized, device_id, tmp_path, bytes_written, outcome`

## Test Plan (expanded)

- Cross-device scenario fails cleanly.
- Symlink/Traversal attempts rejected.
- Kill between fsync and rename leaves no partial visible file.

## Edge Cases & Decisions

- Windows vs POSIX differences documented; limit to POSIX guarantees for v1.

## Traceability

| Requirement Ref | Section in This Doc | Test/Fixture |
| --- | --- | --- |
| File safety (system-design §4) | Atomic write, Locking, Errors | chaos tests, cross-device fixture |

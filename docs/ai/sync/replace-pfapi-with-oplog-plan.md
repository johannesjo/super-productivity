# Plan: Replace PFAPI with Operation Log Sync for All Providers

## Goal

Simplify the codebase by removing PFAPI's model-by-model sync and using operation logs exclusively for **all sync providers** (WebDAV, Dropbox, LocalFile). Migration required for existing users; old PFAPI files kept as backup.

## Complexity: MEDIUM-HIGH

**Estimated effort**: ~2-3 weeks

---

## Decisions Made

- ✅ All providers migrate (including LocalFile)
- ✅ Keep old PFAPI files as backup after migration
- ✅ Migration required for existing users

---

## Implementation Phases

### Phase 1: Enable Operation Log Sync (All Providers)

**Files to modify:**

- `src/app/pfapi/api/sync/providers/webdav/webdav-base-provider.ts` - Add `supportsOperationSync: true`
- `src/app/pfapi/api/sync/providers/dropbox/dropbox.ts` - Add `supportsOperationSync: true`
- `src/app/pfapi/api/sync/providers/local-file-sync/local-file-sync-base.ts` - Add `supportsOperationSync: true`

**Tasks:**

1. Mark all providers as operation-sync-capable
2. Test file-based operation sync path (`_uploadPendingOpsViaFiles`, `_downloadRemoteOpsViaFiles`)
3. Verify manifest management works for all providers

### Phase 2: Migration Logic

**New file:**

- `src/app/core/persistence/operation-log/migration/pfapi-migration.service.ts`

**Migration flow:**

1. On first sync with operation-log provider:
   - Check for existing PFAPI metadata file on remote
   - If exists: download full state via PFAPI model sync
   - Create SYNC_IMPORT operation from downloaded state
   - Upload initial snapshot via operation log
   - Mark PFAPI files as migrated (rename or add marker file)
2. Subsequent syncs use operation log only

**Edge cases:**

- Mid-migration failure recovery
- Multiple devices migrating concurrently
- Empty remote (no migration needed)

### Phase 3: PFAPI Code Removal

**Files to simplify/remove:**

- `src/app/pfapi/api/sync/model-sync.service.ts` - Remove or reduce to migration-only
- `src/app/pfapi/api/sync/meta-sync.service.ts` - Simplify (remove revMap logic)
- `src/app/pfapi/api/util/get-sync-status-from-meta-files.ts` - Remove (replaced by operation log status)
- `src/app/pfapi/api/sync/sync.service.ts` - Remove file-sync branches

**Keep:**

- Provider interface file operations (needed for operation log files)
- Auth flows
- Encryption/compression utilities

### Phase 4: Testing & Cleanup

1. Multi-device sync scenarios
2. Migration testing (PFAPI → operation log)
3. Large operation log handling
4. Update/remove obsolete tests

---

## Key Files

### Providers

```
src/app/pfapi/api/sync/providers/webdav/webdav-base-provider.ts
src/app/pfapi/api/sync/providers/dropbox/dropbox.ts
src/app/pfapi/api/sync/providers/local-file-sync/local-file-sync-base.ts
```

### Operation Log Sync

```
src/app/core/persistence/operation-log/sync/operation-log-upload.service.ts
src/app/core/persistence/operation-log/sync/operation-log-download.service.ts
src/app/core/persistence/operation-log/sync/operation-log-manifest.service.ts
src/app/core/persistence/operation-log/sync/operation-log-sync.service.ts
```

### PFAPI (to simplify/remove)

```
src/app/pfapi/api/sync/sync.service.ts
src/app/pfapi/api/sync/model-sync.service.ts
src/app/pfapi/api/sync/meta-sync.service.ts
```

---

## Risks & Mitigations

| Risk                  | Mitigation                                                         |
| --------------------- | ------------------------------------------------------------------ |
| Migration data loss   | Download PFAPI state fully before any writes; keep files as backup |
| Concurrent migrations | Lock mechanism during migration                                    |
| Large operation logs  | Existing compaction/snapshot system handles this                   |
| Encryption compat     | Reuse existing operation encryption service                        |
| Rollback needed       | PFAPI files kept as backup; could restore if needed                |

---

## Current Architecture Context

### PFAPI (Legacy Sync)

- **What it does**: Full state snapshots with vector clocks
- **How it works**: Uploads complete model states as individual files (15 models: tasks, projects, tags, etc.)
- **Conflict detection**: Vector clock comparison on metadata file
- **Files**: One file per model + metadata file

### Operation Log (New Sync)

- **What it does**: Event sourcing - stores every change as an operation
- **How it works**: Appends operations to a log, replays to reconstruct state
- **Conflict detection**: Vector clocks per operation + dependency resolution
- **Files**: Operation batch files in `ops/` directory + manifest

### Why This Simplification Works

The operation log system already has file-based sync infrastructure:

- `_uploadPendingOpsViaFiles()` in operation-log-upload.service.ts
- `_downloadRemoteOpsViaFiles()` in operation-log-download.service.ts

These use the generic `SyncProviderServiceInterface` methods that WebDAV, Dropbox, and LocalFile already implement:

- `uploadFile()`, `downloadFile()`, `removeFile()`, `listFiles()`

So the core sync logic is already provider-agnostic - we just need to:

1. Enable it for all providers
2. Handle migration from existing PFAPI data
3. Remove the now-unused PFAPI model sync code

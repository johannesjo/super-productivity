# Operation Log: Execution Plan

**Created:** December 2, 2025
**Branch:** `feat/operation-logs`
**Status:** ✅ Core Implementation Complete
**Last Updated:** December 3, 2025

---

## Overview

This execution plan is organized around the three parts of the [Operation Log Architecture](./operation-log-architecture.md):

| Part                      | Purpose                        | Status      |
| ------------------------- | ------------------------------ | ----------- |
| **A. Local Persistence**  | Fast writes, crash recovery    | ✅ Complete |
| **B. Legacy Sync Bridge** | Vector clock updates for PFAPI | ✅ Complete |
| **C. Server Sync**        | Op-log based sync              | ✅ Complete |

---

## What's Done ✅

| Component                       | Part | Notes                                    |
| ------------------------------- | ---- | ---------------------------------------- |
| SUP_OPS IndexedDB store         | A    | ops + state_cache tables                 |
| NgRx effect capture             | A    | Converts actions to operations           |
| Per-op vector clock             | A    | Causality tracking                       |
| Snapshot + tail hydration       | A    | Fast startup from state_cache            |
| Genesis migration               | A    | Legacy pf → SUP_OPS on first run         |
| Multi-tab coordination          | A    | BroadcastChannel + Web Locks             |
| Compaction triggers             | A    | Every 500 ops with 7-day retention       |
| Rollback notification           | A    | Snackbar with reload on persistence fail |
| `PfapiStoreDelegateService`     | B    | Reads NgRx state for sync                |
| META_MODEL vector clock update  | B    | Legacy sync detects local changes        |
| Sync download persistence       | B    | Downloaded data persisted to SUP_OPS     |
| All models in NgRx              | B    | No hybrid persistence                    |
| Server sync upload/download     | C    | Individual operation sync                |
| File-based sync fallback        | C    | For WebDAV/Dropbox providers             |
| Entity-level conflict detection | C    | Vector clock comparison per entity       |
| Conflict resolution dialog      | C    | User chooses local vs remote             |
| Rejected operation tracking     | C    | `rejectedAt` field, excluded from sync   |
| Dependency resolution           | C    | Retry queue for missing dependencies     |

---

## Resolved Gaps ✅

| Gap (was 🔴)                        | Resolution                                         |
| ----------------------------------- | -------------------------------------------------- |
| META_MODEL vector clock not updated | Now incremented on every op write                  |
| Sync download not persisted         | SYNC_IMPORT op + snapshot on download              |
| Non-NgRx models not migrated        | All models now in NgRx                             |
| SaveToDbEffects still active        | Removed - persistence via OperationLogEffects      |
| Compaction never triggers           | Triggers every 500 ops                             |
| Lost local ops on conflict          | Now marked `rejectedAt`, excluded from getUnsynced |
| No rollback on persistence fail     | Snackbar with reload action                        |

---

# Future Enhancements

These are optional improvements identified during code review. None are blocking.

## Performance Optimizations

| Enhancement                   | Description                                    | Priority | Effort |
| ----------------------------- | ---------------------------------------------- | -------- | ------ |
| IndexedDB index for unsynced  | Add index on `syncedAt` for O(1) getUnsynced() | Low      | Low    |
| Optimize getAppliedOpIds()    | Consider Merkle trees if log grows very large  | Low      | Medium |
| Persistent compaction counter | Track `opsSinceCompaction` across restarts     | Low      | Low    |

**Notes:**

- Current `getUnsynced()` does full scan, but compaction keeps log bounded (~500 ops max)
- Performance optimization only needed if users report slow sync initiation

## Observability & Tooling

| Enhancement          | Description                           | Priority | Effort |
| -------------------- | ------------------------------------- | -------- | ------ |
| Operation Log Viewer | Hidden debug panel to view op history | Medium   | Medium |

**Implementation idea:**

- Add debug tab in Settings → About section
- Show: total ops, pending ops, last sync time, current vector clock
- List recent operations with seq, id, type, timestamp

## Storage Efficiency

| Enhancement        | Description                               | Priority | Effort |
| ------------------ | ----------------------------------------- | -------- | ------ |
| Diff-based storage | Store diffs for large text fields (notes) | Defer    | High   |

**Notes:**

- Most operations are small (task title, checkbox toggles)
- Notes might benefit, but they're infrequently edited
- diff-match-patch adds complexity - defer until storage is a user-reported issue

---

# Testing Checklist

## Part A: Local Persistence

- [x] Create task → Reload app → Task exists
- [x] Check SUP_OPS has the operation
- [x] Check `pf` database task table is empty/stale
- [x] Create 600 ops → Check compaction ran
- [x] Corrupt SUP_OPS → App recovers from pf

## Part B: Legacy Sync

- [x] Create task → Check META_MODEL vector clock incremented
- [x] WebDAV sync detects and uploads the task
- [x] Dropbox sync detects and uploads the task
- [x] LocalFile sync detects and uploads the task
- [x] Sync downloads remote data → Restart → Data persists

## Part C: Server Sync

- [x] Operations upload to server
- [x] Operations download from server
- [x] Conflict detection shows dialog
- [x] Choosing "remote" marks local ops as rejected
- [x] Rejected ops excluded from next sync
- [x] Persistence failure shows reload snackbar

## Multi-Tab

- [x] Create task in Tab A → Appears in Tab B
- [x] Both tabs have same SUP_OPS state

---

# File Reference

```
src/app/core/persistence/operation-log/
├── operation.types.ts                    # Type definitions (incl. rejectedAt)
├── operation-log-store.service.ts        # SUP_OPS IndexedDB + markRejected()
├── operation-log.effects.ts              # Action capture + rollback notification
├── operation-log-hydrator.service.ts     # Startup hydration + recovery
├── operation-log-compaction.service.ts   # Snapshot + cleanup
├── operation-log-sync.service.ts         # Upload/download operations
├── operation-applier.service.ts          # Apply ops with dependency handling
├── operation-converter.util.ts           # Op ↔ Action conversion
├── persistent-action.interface.ts        # PersistentAction type
├── lock.service.ts                       # Cross-tab locking
├── multi-tab-coordinator.service.ts      # BroadcastChannel coordination
├── schema-migration.service.ts           # State schema migrations
├── dependency-resolver.service.ts        # Extract/check op dependencies
└── conflict-resolution.service.ts        # Conflict UI + markRejected()

src/app/pfapi/
├── pfapi-store-delegate.service.ts       # Reads NgRx for sync
└── pfapi.service.ts                      # Sync orchestration
```

---

# References

- [Architecture](./operation-log-architecture.md) - System design (Part A/B/C)
- [PFAPI Architecture](./pfapi-sync-persistence-architecture.md) - Legacy sync system

# Operation Log & Sync: Quick Reference

This document provides visual summaries of each major component in the operation log and sync system. For detailed documentation, see `operation-log-architecture.md` and `operation-log-architecture-diagrams.md`.

---

## Area 1: Write Path

The write path captures user actions and persists them as operations to IndexedDB.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Write Path                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User Action  ──►  NgRx Dispatch                            │
│                              │                                  │
│  2. Reducers     ──►  State Updated (optimistic)               │
│                              │                                  │
│  3. Meta-reducer ──►  operationCaptureMetaReducer              │
│                              │                                  │
│  4. Queue        ──►  OperationCaptureService.enqueue()        │
│                              │                                  │
│  5. Effect       ──►  OperationLogEffects.persistOperation$    │
│                              │                                  │
│  6. Lock         ──►  Web Locks API (cross-tab coordination)   │
│                              │                                  │
│  7. Clock        ──►  incrementVectorClock(clock, clientId)    │
│                              │                                  │
│  8. Validate     ──►  validateOperationPayload() (Checkpoint A)│
│                              │                                  │
│  9. Persist      ──►  SUP_OPS.ops (IndexedDB)                  │
│                              │                                  │
│ 10. Upload       ──►  ImmediateUploadService.trigger()         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Files:**
- `operation-capture.meta-reducer.ts` - Captures persistent actions
- `operation-capture.service.ts` - FIFO queue
- `operation-log.effects.ts` - Writes to IndexedDB
- `operation-log-store.service.ts` - IndexedDB wrapper

---

## Area 2: Read Path (Hydration)

The read path loads application state at startup by combining a snapshot with tail operations.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Read Path                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. App Startup                                                 │
│                              │                                  │
│  2. Parallel Recovery  ──►  _recoverPendingRemoteOps()         │
│                              _migrateVectorClockFromPfapi()     │
│                              hasStateCacheBackup()              │
│                              │                                  │
│  3. Load Snapshot     ──►  SUP_OPS.state_cache                 │
│                              │                                  │
│  4. Schema Migration  ──►  migrateStateIfNeeded() (if needed)  │
│                              │                                  │
│  5. Validate          ──►  Checkpoint B                        │
│                              │                                  │
│  6. Restore Clock     ──►  setVectorClock(snapshot.vectorClock)│
│                              │                                  │
│  7. Load to NgRx      ──►  loadAllData(snapshot.state)         │
│                              │                                  │
│  8. Load Tail Ops     ──►  getOpsAfterSeq(lastAppliedOpSeq)    │
│                              │                                  │
│  9. Migrate Tail      ──►  _migrateTailOps()                   │
│                              │                                  │
│ 10. Bulk Replay       ──►  bulkApplyOperations()               │
│                              │                                  │
│ 11. Validate          ──►  Checkpoint C                        │
│                              │                                  │
│ 12. Save Snapshot     ──►  saveStateCache() (if many ops)      │
│                              │                                  │
│ 13. Deferred Check    ──►  _scheduleDeferredValidation() (5s)  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Files:**
- `operation-log-hydrator.service.ts` - Orchestrates hydration
- `schema-migration.service.ts` - Schema migrations
- `bulk-hydration.meta-reducer.ts` - Bulk operation application

---

## Area 3: Server Sync (SuperSync)

SuperSync exchanges individual operations with a centralized server.

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE SYNC CYCLE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. UPLOAD                                                      │
│     ├─ Flush pending writes                                    │
│     ├─ Server migration check (inside lock)                    │
│     ├─ Upload ops in batches of 25                             │
│     ├─ Receive piggybacked ops + rejected ops list             │
│     ├─ Process piggybacked → triggers conflict detection       │
│     └─ Handle rejected → LWW or mark rejected                  │
│                                                                 │
│  2. DOWNLOAD (if hasMorePiggyback or scheduled)                │
│     ├─ GET /ops?sinceSeq=X                                     │
│     ├─ Gap detection → reset to seq 0 if needed                │
│     ├─ Filter already-applied ops                              │
│     ├─ Decrypt if encrypted                                    │
│     ├─ Paginate while hasMore                                  │
│     └─ Return ops for processing                               │
│                                                                 │
│  3. PROCESS REMOTE OPS                                         │
│     ├─ Schema migration                                        │
│     ├─ Filter ops invalidated by SYNC_IMPORT                   │
│     ├─ Full-state op? → Apply directly                         │
│     ├─ Conflict detection via vector clocks                    │
│     ├─ LWW resolution if conflicts                             │
│     ├─ Apply to NgRx via operationApplier                      │
│     ├─ Merge clocks                                            │
│     └─ Validate state (Checkpoint D)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Files:**
- `operation-log-sync.service.ts` - Sync orchestration
- `operation-log-upload.service.ts` - Upload logic
- `operation-log-download.service.ts` - Download logic

---

## Area 4: Conflict Detection

Conflict detection uses vector clocks to determine causal relationships.

```
                      Remote Op Arrives
                            │
                            ▼
                ┌───────────────────────┐
                │ Get entity IDs from op│
                └───────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
    For each entityId:                 All checked?
            │                               │
            ▼                               ▼
    ┌───────────────────┐          Return { conflicts,
    │ Build local       │          nonConflicting }
    │ frontier clock    │
    └───────────────────┘
            │
            ▼
    ┌───────────────────┐
    │ Compare clocks    │
    │ local vs remote   │
    └───────────────────┘
            │
    ┌───────┼───────┬───────────┬──────────┐
    ▼       ▼       ▼           ▼          ▼
  EQUAL  GREATER  LESS       CONCURRENT
    │    _THAN    _THAN          │
    │       │       │            │
    ▼       ▼       ▼            ▼
  Skip    Skip   Has local   TRUE CONFLICT
  (dup)  (stale) pending?     → Collect
                    │
              ┌─────┴─────┐
              ▼           ▼
             NO          YES
              │           │
              ▼           ▼
           Apply      CONFLICT
                     (needs pending)
```

**Comparison Results:**

| Comparison | Meaning | Has Local Pending? | Action |
|------------|---------|-------------------|--------|
| `EQUAL` | Same operation | N/A | Skip (duplicate) |
| `GREATER_THAN` | Local is newer | N/A | Skip (stale remote) |
| `LESS_THAN` | Remote is newer | No | Apply remote |
| `LESS_THAN` | Remote is newer | Yes | Apply (remote dominates) |
| `CONCURRENT` | Neither dominates | No | Apply remote |
| `CONCURRENT` | Neither dominates | Yes | **TRUE CONFLICT** |

**Key Files:**
- `vector-clock.service.ts` - Vector clock management
- `conflict-resolution.service.ts` - Conflict detection logic
- `src/app/pfapi/api/util/vector-clock.ts` - Clock comparison

---

## Area 5: Conflict Resolution (LWW)

Last-Write-Wins automatically resolves conflicts using timestamps.

```
┌─────────────────────────────────────────────────────────────────┐
│                    LWW RESOLUTION PIPELINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CONFLICT DETECTED (vector clocks CONCURRENT)               │
│     Local ops: [Op1, Op2]   Remote ops: [Op3]                  │
│                                                                 │
│  2. COMPARE TIMESTAMPS                                          │
│     local_max = max(Op1.ts, Op2.ts)                            │
│     remote_max = max(Op3.ts)                                    │
│                                                                 │
│  3a. IF local_max > remote_max → LOCAL WINS                    │
│      ├─ Create new UPDATE op with:                             │
│      │   • Current state from NgRx store                       │
│      │   • Merged clock (all ops) + increment                  │
│      │   • Preserved original timestamp                        │
│      ├─ Reject old local ops (stale clocks)                    │
│      ├─ Store remote ops, mark rejected                        │
│      └─ New op will sync on next cycle                         │
│                                                                 │
│  3b. IF remote_max >= local_max → REMOTE WINS                  │
│      ├─ Apply remote ops to NgRx                               │
│      ├─ Reject local ops (including ALL pending for entity)   │
│      └─ Remote state is now authoritative                      │
│                                                                 │
│  4. VALIDATE STATE (Checkpoint D)                               │
│     Run validateAndRepairCurrentState()                        │
│                                                                 │
│  5. NOTIFY USER                                                 │
│     "Auto-resolved X conflicts: Y local, Z remote wins"        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Invariants:**

| Invariant | Reason |
|-----------|--------|
| Preserve original timestamp | Prevents unfair advantage in future conflicts |
| Merge ALL clocks | New op dominates everything known |
| Reject ALL pending ops for entity | Prevents stale ops from being uploaded |
| Mark rejected BEFORE applying | Crash safety |
| Remote wins on tie | Server-authoritative |

**Key Files:**
- `conflict-resolution.service.ts` - LWW resolution
- `stale-operation-resolver.service.ts` - Stale op handling

---

## Area 6: SYNC_IMPORT Filtering

Clean slate semantics ensure imports restore all clients to the same state.

```
┌─────────────────────────────────────────────────────────────────┐
│                 SYNC_IMPORT FILTERING PIPELINE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Remote Ops Received: [Op1, Op2, SYNC_IMPORT, Op3, Op4]        │
│                                                                 │
│  1. FIND IMPORTS                                                │
│     ├─ Check current batch for SYNC_IMPORT/BACKUP_IMPORT/REPAIR│
│     └─ Check local store for previously downloaded import      │
│                                                                 │
│  2. DETERMINE LATEST IMPORT                                     │
│     └─ Compare by UUIDv7 ID (time-ordered)                     │
│                                                                 │
│  3. FOR EACH OP:                                                │
│     ├─ Is it a full-state op? → ✅ Keep                        │
│     └─ Compare vectorClock with import's clock:                │
│         ├─ GREATER_THAN → ✅ Keep (has knowledge)              │
│         ├─ EQUAL        → ✅ Keep (same history)               │
│         ├─ LESS_THAN    → ❌ Drop (dominated)                  │
│         └─ CONCURRENT   → ❌ Drop (clean slate)                │
│                                                                 │
│  4. RETURN                                                      │
│     ├─ validOps: [SYNC_IMPORT, Op4]                            │
│     └─ invalidatedOps: [Op1, Op2, Op3]                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why Vector Clocks, Not UUIDv7 Timestamps?**

| Approach | Problem |
|----------|---------|
| UUIDv7 Timestamps | Affected by clock drift |
| Vector Clocks | Track **causality** - immune to clock drift |

**Key Files:**
- `sync-import-filter.service.ts` - Filtering logic

---

## Area 7: Archive Handling

Archive data bypasses NgRx and is stored directly in IndexedDB.

```
┌─────────────────────────────────────────────────────────────────┐
│                   ARCHIVE HANDLING PIPELINE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LOCAL OPERATION                                                │
│  ───────────────                                                │
│  1. User completes task                                         │
│  2. ArchiveService writes to archiveYoung (BEFORE dispatch)    │
│  3. Dispatch moveToArchive action                               │
│  4. Reducer updates NgRx state                                  │
│  5. ArchiveOperationHandlerEffects                              │
│     └─ handleOperation() → SKIP (already written)              │
│  6. Operation logged with payload (no archive data!)            │
│                                                                 │
│  REMOTE OPERATION                                               │
│  ────────────────                                               │
│  1. Download moveToArchive operation                            │
│  2. OperationApplierService.applyOperations()                   │
│     ├─ dispatch(bulkApplyOperations) → Reducer updates state   │
│     └─ handleOperation() → Write to archiveYoung               │
│  3. Result: Same archive state as originating client            │
│                                                                 │
│  KEY INSIGHT: Archive data NOT in operation payload!            │
│  Each client executes the SAME deterministic logic locally.     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why This Architecture?**

| Concern | Solution |
|---------|----------|
| Archive size | Don't sync archive data in operations |
| Consistency | Deterministic replay produces same result |
| Performance | Local writes, no network overhead |
| Sync safety | Operations carry timestamps for reproducibility |

**Key Files:**
- `archive-operation-handler.service.ts` - Unified handler
- `archive-operation-handler.effects.ts` - Local action routing
- `operation-applier.service.ts` - Calls handler for remote ops

---

## Areas 8-12: Coming Soon

- **Area 8: Meta-Reducers** - Atomic multi-entity changes
- **Area 9: Compaction** - Snapshot creation, old op deletion
- **Area 10: Bulk Application** - Performance optimization
- **Area 11: Encryption (E2E)** - AES-256-GCM + Argon2id
- **Area 12: Legacy PFAPI Bridge** - WebDAV/Dropbox sync

---

## File Reference

```
src/app/core/persistence/operation-log/
├── operation.types.ts                    # Type definitions
├── operation-log.const.ts                # Constants
├── operation-log.effects.ts              # Write path effect
├── store/
│   ├── operation-log-store.service.ts    # IndexedDB wrapper
│   ├── operation-log-hydrator.service.ts # Hydration
│   └── schema-migration.service.ts       # Schema migrations
├── sync/
│   ├── operation-log-sync.service.ts     # Sync orchestration
│   ├── operation-log-upload.service.ts   # Upload logic
│   ├── operation-log-download.service.ts # Download logic
│   ├── conflict-resolution.service.ts    # LWW resolution
│   ├── sync-import-filter.service.ts     # SYNC_IMPORT filtering
│   └── vector-clock.service.ts           # Clock management
└── processing/
    ├── operation-applier.service.ts      # Apply ops to NgRx
    ├── operation-capture.meta-reducer.ts # Capture actions
    ├── operation-capture.service.ts      # FIFO queue
    └── archive-operation-handler.service.ts # Archive side effects
```

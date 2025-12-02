# Delta Sync vs Operation Log: Structured Comparison

**Model:** Claude Opus 4.5
**Date:** December 2, 2025
**Branches Compared:** `feat/sync-server` (Delta Sync) vs `feat/operation-logs` (Operation Log)

---

## 1. Executive Summary

This document provides a structured comparison between two synchronization approaches implemented for Super Productivity:

| Approach          | Branch                | Core Principle                                 |
| ----------------- | --------------------- | ---------------------------------------------- |
| **Delta Sync**    | `feat/sync-server`    | Compare state snapshots, transmit differences  |
| **Operation Log** | `feat/operation-logs` | Record actions, transmit and replay operations |

**Bottom Line:** The operation-log approach trades _state-comparison complexity_ for _operation-ordering complexity_. Both solve the core problems (granular sync, better conflict handling), but operation-log provides a stronger foundation for correctness at the cost of higher upfront implementation complexity.

---

## 2. Architectural Comparison

### 2.1 Data Model

#### Delta Sync (`feat/sync-server`)

```
Client Storage:
├── IndexedDB (app data)
│   └── tasks, projects, tags, notes, etc.
├── IndexedDB (shadow state)
│   └── super-sync-shadow DB
│       ├── shadow_state: last synced state per model
│       └── watermarks: last sync revision per model
└── Memory
    └── lastSyncedState Map (cache)

Remote Storage:
└── Server SQLite
    ├── changes table (append-only event log)
    └── meta per user (revMap, vectorClock)
```

**Observation:** Two parallel data models (app state + shadow state) that must stay synchronized.

#### Operation Log (`feat/operation-logs`)

```
Client Storage:
├── IndexedDB (SUP_OPS DB)
│   ├── ops: chronological operation log
│   │   └── {seq, op, appliedAt, source, syncedAt}
│   └── state_cache: periodic snapshots
│       └── {state, lastAppliedOpSeq, vectorClock, compactedAt}
└── NgRx Store (derived from ops)

Remote Storage:
├── ops/ directory
│   └── ops_CLIENTID_TIMESTAMP.json files
└── manifest.json
    └── {version, operationFiles[]}
```

**Observation:** Single source of truth (operation log), with state as a derived view.

### 2.2 Sync Unit

| Aspect                 | Delta Sync                                       | Operation Log                                                                                                                                        |
| ---------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What's transmitted** | Partial patches (changed fields)                 | Complete operations (actions)                                                                                                                        |
| **Granularity**        | Field-level                                      | Action-level                                                                                                                                         |
| **Example payload**    | `{id: "T1", type: "TASK", data: {title: "New"}}` | `{id: "uuid", actionType: "[Task] Update", opType: "UPD", entityType: "TASK", entityId: "T1", payload: {task: {id: "T1", changes: {title: "New"}}}}` |
| **Payload size**       | Smaller (only changed fields)                    | Larger (full action context)                                                                                                                         |

---

## 3. Comparison by Criteria

### 3.1 Sync Speed

#### Delta Sync

| Scenario               | Performance                                    |
| ---------------------- | ---------------------------------------------- |
| **Initial sync**       | Fast (download meta, then only changed models) |
| **Incremental sync**   | Fast (small patches)                           |
| **Many small changes** | Optimal (each change = small patch)            |
| **Large entity edits** | Good (only changed fields transmitted)         |

**Bottleneck:** Diff calculation (`createDiff`) is O(N) where N = number of entities. For users with 10,000+ tasks, this can block the main thread.

```typescript
// diff-utils.ts - must iterate all entities
current.ids.forEach((id: string) => {
  const currentEntity = current.entities[id];
  const previousEntity = previous.entities?.[id];
  if (JSON.stringify(currentEntity) !== JSON.stringify(previousEntity)) {
    // Calculate field-level diff...
  }
});
```

#### Operation Log

| Scenario               | Performance                                         |
| ---------------------- | --------------------------------------------------- |
| **Initial sync**       | Slower (download all op files, or snapshot + tail)  |
| **Incremental sync**   | Medium (download new op files, parse, filter dupes) |
| **Many small changes** | Heavier (each change = full operation object)       |
| **Large entity edits** | Similar (operation payload can be large)            |

**Bottleneck:** Operation replay on startup. Must load snapshot + replay tail operations.

```typescript
// operation-log-hydrator.service.ts
const snapshot = await this.opLogStore.loadStateCache();
const tailOps = await this.opLogStore.getOpsAfterSeqDirect(
  snapshot?.lastAppliedOpSeq || 0,
);
// Replay each operation...
```

#### Verdict: Sync Speed

| Metric               | Delta Sync | Operation Log |
| -------------------- | :--------: | :-----------: |
| Initial sync         |   ★★★★☆    |     ★★★☆☆     |
| Incremental sync     |   ★★★★★    |     ★★★☆☆     |
| Bandwidth efficiency |   ★★★★★    |     ★★★☆☆     |
| CPU efficiency       |   ★★★☆☆    |     ★★★★☆     |

**Winner:** Delta Sync (for bandwidth), but close. Operation log avoids expensive diff calculations.

---

### 3.2 Disk Usage

#### Delta Sync

```
Storage footprint:
├── App data: ~X MB (depends on user data)
├── Shadow state: ~X MB (duplicate of app data per model)
└── Total: ~2X MB
```

**Problem:** Shadow state approximately doubles storage requirements. For users with large archives (50+ MB), this is significant.

#### Operation Log

```
Storage footprint:
├── Operation log: Variable (grows until compaction)
├── State cache: ~X MB (periodic snapshot)
├── Compacted state: ~X MB
└── Total: X + log size (compacted regularly)
```

**Mitigation:** Compaction service (`operation-log-compaction.service.ts`) periodically:

1. Creates state snapshot
2. Deletes synced operations older than retention window (7 days)

```typescript
// operation-log-compaction.service.ts
async deleteOpsWhere(predicate: (entry) => boolean): Promise<void> {
  // Delete ops that are: synced AND applied < retention AND seq <= lastSeq
}
```

#### Verdict: Disk Usage

| Metric               | Delta Sync | Operation Log |
| -------------------- | :--------: | :-----------: |
| Steady-state storage |   ★★☆☆☆    |     ★★★★☆     |
| Peak storage         |   ★★☆☆☆    |     ★★★☆☆     |
| Predictability       |   ★★★☆☆    |     ★★★★☆     |

**Winner:** Operation Log (with compaction). Delta sync's shadow state creates persistent ~2X overhead.

---

### 3.3 Maintainability

#### Delta Sync

**Complexity Sources:**

1. Two data models to keep consistent (app state + shadow state)
2. Implicit mode switching (BLOB vs ENTITY)
3. Encryption has two code paths (whole-file vs granular)
4. Watermark + shadow + vector clock must all stay synchronized

**Code Metrics:**

- `super-sync.ts`: 940 lines
- `sync.service.ts`: 755 lines
- Many conditional branches for mode detection

**Pain Points:**

- Adding a new model requires updating `BLOB_MODELS` set, `MODEL_DEFAULTS`, and entity type mapping
- Debugging requires understanding shadow state contents
- State corruption is hard to diagnose

#### Operation Log

**Complexity Sources:**

1. Operation schema evolution (must migrate old operations)
2. Action whitelist maintenance (`action-whitelist.ts`)
3. Dependency resolution for inter-entity relationships
4. Replay determinism requirements

**Code Metrics:**

- `operation-log-store.service.ts`: 320 lines
- `operation-log-sync.service.ts`: 293 lines
- `operation-log-effects.ts`: 82 lines
- Clear separation of concerns

**Pain Points:**

- Adding a new action requires updating whitelist
- Reducers must be pure (no side effects during replay)
- Effect suppression during replay needs careful management

#### Verdict: Maintainability

| Metric              | Delta Sync | Operation Log |
| ------------------- | :--------: | :-----------: |
| Code clarity        |   ★★☆☆☆    |     ★★★★☆     |
| Adding new features |   ★★☆☆☆    |     ★★★☆☆     |
| Debugging           |   ★★☆☆☆    |     ★★★★☆     |
| Testing             |   ★★☆☆☆    |     ★★★★☆     |

**Winner:** Operation Log. The single-source-of-truth model is easier to reason about.

---

### 3.4 Conflict Handling

#### Delta Sync

**Conflict Detection:** Global vector clock comparison at metadata level.

```typescript
// get-sync-status-from-meta-files.ts
const comparison = compareVectorClocks(localVector, remoteVector);
if (comparison === VectorClockComparison.CONCURRENT) {
  return { status: SyncStatus.Conflict, conflictData: {...} };
}
```

**Conflict Resolution:**

1. User dialog: "Use Local" / "Use Remote" / "Cancel"
2. Auto-merge attempt for SuperSync (timestamp-based per-entity)
3. Falls back to dialog if auto-merge fails

**Limitations:**

- Whole-file conflict detection (not per-entity)
- Auto-merge uses timestamps, not true causality
- User must choose entire data set, not individual conflicts

#### Operation Log

**Conflict Detection:** Per-entity vector clock comparison.

```typescript
// operation-log-sync.service.ts
for (const remoteOp of remoteOps) {
  for (const entityId of entityIdsToCheck) {
    const entityKey = `${remoteOp.entityType}:${entityId}`;
    const localFrontier = /* merge all local clocks for this entity */;
    const vcComparison = compareVectorClocks(localFrontier, remoteOp.vectorClock);
    if (vcComparison === VectorClockComparison.CONCURRENT) {
      conflicts.push({ entityType, entityId, localOps, remoteOps, ... });
    }
  }
}
```

**Conflict Resolution:**

1. Non-conflicting operations auto-applied
2. Per-entity conflict UI (not yet fully implemented)
3. Granular merge possibilities (future: field-level merge)

**Advantages:**

- Conflicts are per-entity, not whole-file
- Non-conflicting changes sync automatically
- Preserves full causality chain for debugging

#### Verdict: Conflict Handling

| Metric                | Delta Sync | Operation Log |
| --------------------- | :--------: | :-----------: |
| Detection granularity |   ★★☆☆☆    |     ★★★★★     |
| Auto-merge capability |   ★★☆☆☆    |     ★★★★☆     |
| User experience       |   ★★☆☆☆    |     ★★★★☆     |
| Data loss risk        |   ★★☆☆☆    |     ★★★★☆     |

**Winner:** Operation Log (significantly). Per-entity conflict detection is the key differentiator.

---

### 3.5 Robustness with Large Datasets

#### Delta Sync

**Scaling Issues:**

1. **Diff calculation:** O(N) per sync, where N = total entities
2. **Shadow state storage:** Linear growth with data size
3. **Memory pressure:** Large entities loaded twice (current + shadow)

**Observed Problems:**

- Users with 10,000+ tasks report sync slowdowns
- Archive models (50+ MB) cause significant overhead
- No streaming/chunking for large downloads

#### Operation Log

**Scaling Issues:**

1. **Log growth:** Unbounded without compaction
2. **Replay time:** Linear with operations since last snapshot
3. **Snapshot size:** Same as total state size

**Mitigations:**

- Compaction keeps log size bounded (7-day retention)
- Periodic snapshots limit replay window
- Pagination in sync (`MAX_OPS_PER_FILE = 100`)

```typescript
// operation-log-sync.service.ts
const MAX_OPS_PER_FILE = 100;
const chunks = chunkArray(pendingOps, MAX_OPS_PER_FILE);
```

#### Verdict: Robustness with Large Datasets

| Metric          | Delta Sync | Operation Log |
| --------------- | :--------: | :-----------: |
| CPU scaling     |   ★★☆☆☆    |     ★★★★☆     |
| Memory scaling  |   ★★☆☆☆    |     ★★★☆☆     |
| Storage scaling |   ★★☆☆☆    |     ★★★★☆     |
| Network scaling |   ★★★★☆    |     ★★★☆☆     |

**Winner:** Operation Log. Compaction and snapshots provide better scaling characteristics.

---

### 3.6 Expected Long-Term Complexity

#### Delta Sync

**Growth Trajectory:**

- Each new model type requires shadow state handling
- Encryption modes may proliferate
- Performance optimizations (dirty tracking, selective diffing) add complexity
- Edge case handlers accumulate over time

**Technical Debt Accumulation:** High

- Many TODOs already in codebase
- Mode-switching logic becomes harder to test
- Shadow state consistency becomes harder to guarantee

#### Operation Log

**Growth Trajectory:**

- Each new action type needs whitelist entry
- Operation schema evolution needs migration handlers
- Conflict resolution strategies may become more sophisticated
- Compaction strategies may need tuning

**Technical Debt Accumulation:** Medium

- Schema versioning handles evolution explicitly
- Single data model limits inconsistency sources
- Replay determinism is a one-time investment

#### Verdict: Long-Term Complexity

| Metric                | Delta Sync | Operation Log |
| --------------------- | :--------: | :-----------: |
| Complexity trajectory |   ★★☆☆☆    |     ★★★☆☆     |
| Refactoring risk      |   ★★☆☆☆    |     ★★★★☆     |
| Team onboarding       |   ★★☆☆☆    |     ★★★☆☆     |
| Bug surface area      |   ★★☆☆☆    |     ★★★★☆     |

**Winner:** Operation Log. The single-source-of-truth architecture limits complexity growth.

---

## 4. Summary Matrix

| Criterion                    | Delta Sync | Operation Log | Winner            |
| ---------------------------- | :--------: | :-----------: | ----------------- |
| **Sync Speed**               |   ★★★★☆    |     ★★★☆☆     | Delta Sync        |
| **Disk Usage**               |   ★★☆☆☆    |     ★★★★☆     | Operation Log     |
| **Maintainability**          |   ★★☆☆☆    |     ★★★★☆     | Operation Log     |
| **Conflict Handling**        |   ★★☆☆☆    |     ★★★★★     | Operation Log     |
| **Large Dataset Robustness** |   ★★☆☆☆    |     ★★★★☆     | Operation Log     |
| **Long-Term Complexity**     |   ★★☆☆☆    |     ★★★★☆     | Operation Log     |
| **Overall**                  | **★★☆☆☆**  |   **★★★★☆**   | **Operation Log** |

---

## 5. Considerations and Trade-offs

### 5.1 When Delta Sync is Better

- **Bandwidth-constrained environments:** Delta sync transmits less data
- **Simple data models:** Few entity types, no complex relationships
- **Read-heavy workloads:** State comparison is fast when changes are rare
- **Existing infrastructure:** If WebDAV/file-based sync is already working

### 5.2 When Operation Log is Better

- **Conflict-prone scenarios:** Multiple devices, frequent concurrent edits
- **Complex data models:** Many entity types with relationships
- **Write-heavy workloads:** Operations avoid repeated full-state comparisons
- **Debugging requirements:** Full audit trail of changes
- **Future extensibility:** Undo/redo, real-time collaboration, event sourcing

### 5.3 Implementation Reality Check

From `docs/ai/operationlog-critique.md`:

> "The operation log approach introduces massive complexity... Total: ~10-12 weeks of implementation for what might be achievable in 2-3 weeks with a simpler approach."

This is a valid concern. However, the critique's "simpler alternative" (per-entity versioning without operation log) essentially recreates many delta sync problems:

- Still needs per-entity version tracking
- Still needs conflict detection per entity
- Doesn't solve the field-level merge problem
- Doesn't provide audit trail

The operation log's complexity is **front-loaded** during implementation but **reduces ongoing maintenance burden**.

---

## 6. Assumptions

1. **Single-user personal data:** Both approaches assume personal devices syncing personal data. Multi-user collaboration would favor operation log more strongly.

2. **Eventually consistent:** Both approaches assume eventual consistency is acceptable. Real-time requirements would need additional infrastructure.

3. **IndexedDB reliability:** Both approaches depend on IndexedDB. Browser-specific issues affect both equally.

4. **Server correctness:** Analysis assumes server implementations match documented behavior.

5. **Network availability:** Both approaches assume occasional connectivity. Extended offline periods with heavy usage stress both systems.

---

## 7. Recommendation

Based on this analysis:

**For Super Productivity's use case (personal productivity app, multiple personal devices, occasional concurrent edits):**

The **Operation Log approach** provides:

- Better conflict handling (the most user-impacting issue)
- Lower long-term maintenance burden
- Cleaner architecture for future development

The **Delta Sync approach** would only be preferable if:

- Bandwidth is severely constrained (unlikely for most users)
- Implementation timeline is extremely tight (but this is sunk cost at this point)
- The data model is frozen (unlikely for an evolving product)

**Caveat:** The operation log implementation in `feat/operation-logs` is not yet complete. Key gaps include:

- Conflict resolution UI (stub implementation)
- Dependency resolver retry mechanism
- Smart resolution suggestions
- Legacy migration testing

Completing the operation log implementation is recommended over attempting to stabilize the delta sync approach, which has fundamental architectural issues that are expensive to fix.

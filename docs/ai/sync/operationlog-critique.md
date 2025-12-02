## 15. Fundamental Architecture Review: Is This The Right Approach?

> **This section questions whether the operation log approach is necessary, or if a simpler solution would suffice.**

### 15.1. The Core Question

The plan assumes we need **full event sourcing** (operation logs). But let's question this:

**What problems are we actually solving?**

1. Per-entity conflict detection (not whole-file)
2. Delta sync (not full state download)
3. Better merge (auto-merge non-conflicting changes)

**Do we need an operation log for these?** No. These can be achieved with **per-entity versioning** without recording every operation.

### 15.2. Complexity Cost of Operation Logs

The operation log approach introduces massive complexity:

| Component               | Complexity | Description                               |
| ----------------------- | ---------- | ----------------------------------------- |
| Two data models         | High       | State snapshots + operations to maintain  |
| Replay determinism      | High       | Reducers must be pure, effects suppressed |
| Compaction              | High       | When to snapshot, garbage collection      |
| Remote snapshot publish | Medium     | Bootstrap points for new devices          |
| Multi-tab coordination  | Medium     | Web Locks, BroadcastChannel, fallbacks    |
| Dependency resolution   | High       | Hard/soft deps, queuing, retries          |
| Dual versioning         | High       | entityVersion + vectorClock + causalDeps  |
| Schema evolution        | Medium     | Op format migrations                      |
| Op → Action conversion  | Medium     | Bidirectional converters                  |
| Effect replay guards    | Medium     | Global flags, replay context              |

**Total: ~10-12 weeks of implementation** for what might be achievable in 2-3 weeks with a simpler approach.

### 15.3. Alternative: Per-Entity Delta Sync (Without Operation Log)

**Concept:** Keep current snapshot-based model, but make sync entity-aware.

```typescript
// Local storage (already exists):
// IndexedDB: tasks, projects, tags, etc.

// Add per-entity version tracking:
interface EntityMeta {
  id: string;
  version: number; // Incremented on each local change
  lastModifiedAt: number;
}

// Remote storage:
// meta.json → { vectorClock, entityVersions: { "TASK:abc123": 5, ... } }
// entities/task/abc123.json → { ...taskData }
// OR keep main.json for small datasets, just add entityVersions

// Sync algorithm:
async function sync() {
  const localMeta = await getLocalMeta();
  const remoteMeta = await downloadMeta();

  for (const [entityKey, remoteVersion] of Object.entries(remoteMeta.entityVersions)) {
    const localVersion = localMeta.entityVersions[entityKey] ?? 0;

    if (remoteVersion > localVersion) {
      // Remote is newer → download
      await downloadEntity(entityKey);
    } else if (localVersion > remoteVersion) {
      // Local is newer → upload
      await uploadEntity(entityKey);
    } else if (isConcurrent(localMeta.vectorClock, remoteMeta.vectorClock)) {
      // Same version but concurrent clocks → potential conflict
      // Compare field-by-field for merge opportunities
      await handleEntityConflict(entityKey);
    }
    // else: same version, same clock → no action
  }
}
```

**Benefits:**

- No operation log to maintain
- No replay, no effect suppression needed
- No compaction/GC complexity
- Existing NgRx reducers work unchanged
- Existing sync providers need minor changes
- 2-3 weeks implementation vs 10-12 weeks

**Trade-offs:**

- No audit trail (who changed what when)
- No undo/redo via replay
- Slightly larger transfer if many entities change together

### 15.4. When IS an Operation Log Valuable?

Operation logs are the right choice when you need:

1. **Audit trails** - "Show me every change ever made" → We said "No" (Q3)
2. **Undo/redo** - Replay backwards → Not planned
3. **Real-time collaboration** - Multiple users editing same doc → Not our use case
4. **Event-driven architecture** - Other systems react to events → Not planned

For a **personal productivity app** syncing across **personal devices**, these aren't requirements.

### 15.5. The "NgRx is Source of Truth" Claim is Misleading

The plan states: "NgRx is the Single Source of Truth"

But this is problematic:

- NgRx state is **in-memory, volatile** - lost on crash/close
- IndexedDB (or op log) is **durable** - survives restarts
- On startup, we **hydrate NgRx FROM IndexedDB**

So IndexedDB is the real source of truth. NgRx is a cache/view.

This matters because if developers assume NgRx state persists, they'll write bugs.

### 15.6. Dual Versioning is Confusing

The plan has THREE versioning mechanisms:

1. `entityVersion: number` - per-entity monotonic counter
2. `globalVectorClock: VectorClock` - for cross-entity ordering
3. `causalDeps: Record<string, number>` - entity dependencies

**Question:** Why do we need all three?

- If we have per-entity versions, do we need globalVectorClock?
- causalDeps is never clearly defined (what goes in it?)

**Simpler:** Just use per-entity version + one global vector clock for sync ordering.

### 15.7. The "Per-Operation Merge" Benefit is Achievable Without Ops

The plan claims operation logs enable "per-operation merge". But consider:

**With operation log:**

```
Op1: Update Task A, {title: "Foo"}
Op2: Update Task A, {timeSpent: 1500000}
Op3: Update Task A, {title: "Bar"} ← Conflict with Op1
```

**With per-entity delta sync:**

```
Device A changed Task A: {title: "Foo", timeSpent: 1500000}
Device B changed Task A: {title: "Bar"}
→ Field-level diff: title conflicts, timeSpent can merge
```

Same outcome! We just need **field-level diffing**, not operation logs.

### 15.8. Network Efficiency

**Operation log approach:**

1. Download manifest.json
2. Download each new ops_xxx.json file (potentially many)
3. Parse each file, filter dupes, process ops

**Per-entity delta approach:**

1. Download meta.json (includes entityVersions)
2. Download only changed entity files (or one main.json with deltas)

The operation log creates more network round-trips and more files to manage.

### 15.9. Recommendation

**Before implementing the full operation log, consider:**

1. **Phase 0 (2-3 weeks):** Implement per-entity versioning + delta sync WITHOUT ops

- Add entityVersions to meta.json
- Add version tracking to pfapi models
- Modify sync to be entity-aware
- Implement field-level conflict merge

2. **Evaluate:** Does this solve the core problems (data loss, conflicts)?

3. **If not sufficient:** Then implement operation logs for specific benefits

This follows YAGNI (You Ain't Gonna Need It) and KISS principles.

### 15.10. Decision Matrix

| Approach             | Complexity | Dev Time  | Solves Core Problems? | Extra Features    |
| -------------------- | ---------- | --------- | --------------------- | ----------------- |
| Current (whole-file) | Low        | 0         | ❌                    | None              |
| Per-entity delta     | Medium     | 2-3 weeks | ✅                    | None              |
| Operation log        | High       | 10+ weeks | ✅                    | Audit, undo (N/A) |
| Full CRDT            | Very High  | 12+ weeks | ✅                    | Real-time collab  |

**Recommended path:** Per-entity delta sync first. Operation log only if specific requirements emerge.

---

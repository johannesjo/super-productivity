# Per-Entity Delta Sync: Planning Document

## 1. Executive Summary

This document outlines the implementation plan for a **Per-Entity Delta Sync** mechanism. This approach is proposed as a lightweight, robust alternative to the complex "Operation Log" architecture. It addresses the core requirements of **data loss prevention**, **conflict minimization**, and **bandwidth efficiency** without the overhead of event sourcing, replay logic, or dual data models.

**Core Philosophy:** Keep the current snapshot-based model but make synchronization "entity-aware" rather than "file-aware".

## 2. Problem Statement

The current "whole-file" sync approach suffers from:

1.  **Data Loss/Overwrites:** If two devices edit different tasks, the last write wins, overwriting the other device's changes to unrelated tasks.
2.  **Bandwidth Inefficiency:** Changing one character in a task requires re-uploading the entire database.
3.  **Conflict Rigidity:** Merging is difficult because the granularity is too coarse (the whole file).

The "Operation Log" proposal solves these but introduces:

- Massive complexity (replaying events, managing two data models).
- Features not currently required (Audit trails, Undo/Redo across sessions).

## 3. Proposed Architecture: Per-Entity Delta Sync

### 3.1. Data Model Extensions

We do not need a separate "Operation" database. We simply augment the existing entity models with version metadata.

#### 3.1.1. Entity Metadata

Every syncable entity (Task, Project, Tag, Metric) will implement a versioning interface:

```typescript
interface EntitySyncMetadata {
  id: string;
  // Monotonic counter, incremented on every local update
  version: number;
  // Timestamp of last update (wall clock, for informational/conflict heurstics)
  lastModifiedAt: number;
  // ID of the device that made the last change (helps avoid echoing back own changes)
  lastModifiedBy: string;
  // Optional: Deleted flag for soft deletes
  isDeleted?: boolean;
}

// Example Task
interface Task extends EntitySyncMetadata {
  title: string;
  isDone: boolean;
  // ... other fields
}
```

#### 3.1.2. Global Sync Metadata (`meta.json`)

Instead of checking the modification time of the huge `main.json`, clients first check a lightweight `meta.json` on the remote provider (WebDAV, Dropbox, etc.).

```typescript
interface RemoteSyncMeta {
  // A global logical clock (or vector clock) to quickly check "has anything changed?"
  globalUpdateCount: number;

  // Map of EntityID -> Version.
  // This allows O(1) lookup to see if a specific entity is stale locally.
  entityVersions: {
    [entityId: string]: number;
  };

  // Timestamp of the last successful sync that updated this meta file
  lastSyncTimestamp: number;
}
```

### 3.2. Remote Storage Structure

To support delta sync, we must be able to read/write parts of the state. We have two options:

**Option A: Split Files (Recommended for scalability)**
Store entities in separate files or chunks.

```
/sup-claude-sync/
  meta.json
  /entities/
    task_123.json
    task_456.json
    project_abc.json
```

_Pros:_ True delta transfers. Reading one task doesn't require parsing the DB.
_Cons:_ Many small files can be slow on some WebDAV servers.

**Option B: Monolithic with Range/Patch support (Complexity)**
Keep `main.json` but use intelligent patching.
_Cons:_ Hard to implement safely with simple file storage APIs.

**Option C: Hybrid / Chunked (Pragmatic)**
Keep `main.json` for the "base state" but use a `updates/` folder for recent changes since the last base rewrite.
_Decision:_ For the "Per-Entity Delta Sync" phase, we will likely stick to **Option A (Split Files)** or a **"Batch" approach** where we upload `changes_[timestamp].json` containing only changed entities, which clients merge.

_Refined Decision for Phase 1:_ To avoid managing thousands of files immediately, we can implement a **"Diff-based"** approach on top of the current file.

1. Download `meta.json`.
2. Identify needed entities.
3. Download `main.json` (if we stick to one file) OR specific entity files (if we split).

_Better Approach for MVP:_
**"Split-Lite"**:

- `meta.json`: Contains versions.
- `data.json`: The full state (backup/bootstrap).
- `deltas/`: Folder containing small JSON files for recent updates (e.g., `delta_{deviceId}_{timestamp}.json`) containing an array of updated entities.
- **Compaction**: Periodically, a client merges deltas into `data.json` and clears the `deltas/` folder.

_Actually, the Critique proposed a cleaner pure split or just entity-aware sync. Let's stick to the Critique's implication:_
**The critique implies we still sync state, just smartly.**
Let's assume **Logical Split** implies we treat data as a collection of entities, even if stored in one file, or we actually split the files.
**Decision**: We will assume **File Splitting** (Option A) is the target goal for maximum efficiency, but **Smart Merging** is the immediate goal.

### 3.3. Synchronization Algorithm

1.  **Local Change**:

    - User updates Task A.
    - App increments `TaskA.version`.
    - App updates local `meta.entityVersions['TaskA']`.
    - App marks Task A as "dirty" (needs sync).

2.  **Sync Process (Initiator)**:
    - **Lock**: Acquire remote lock (optional, but good for safety).
    - **Read Remote Meta**: Download `meta.json`.
    - **Compare**:
      - `Remote.ver > Local.ver`: **Incoming Change**. Add to download queue.
      - `Local.ver > Remote.ver`: **Outgoing Change**. Add to upload queue.
      - `Local.ver != Remote.ver` AND both changed (requires tracking "last synced ver"): **Conflict**.
    - **Process Incoming**:
      - Download the specific entity files (or the full file if monolithic).
      - Update local store.
    - **Process Outgoing**:
      - Upload changed entity files.
      - Update `meta.json` with new versions.
      - Upload new `meta.json`.
    - **Unlock**.

## 4. Conflict Resolution Strategies

Since we track versions per entity, conflicts are scoped to a single task/project.

1.  **Field-Level Merging**:

    - If Task A has a conflict, compare the fields.
    - _Device 1_ changed `title`. _Device 2_ changed `isDone`.
    - **Result**: Apply both. Update version to `max(v1, v2) + 1`.

2.  **Last-Write-Wins (LWW) Fallback**:
    - If both changed `title`, use `lastModifiedAt` to pick the winner.
    - Save a "Conflict Copy" of the loser for manual review if needed (optional).

## 5. Implementation Plan

### Phase 0: Preparation & Data Model

1.  **Audit Models**: Ensure all syncable models (Project, Task, etc.) have stable IDs.
2.  **Add Versioning**: Update TypeScript interfaces to include `EntitySyncMetadata`.
3.  **Migration**: Create a migration script that assigns `version: 1` to all existing local data.

### Phase 1: The "Meta" Layer

1.  **Meta Generation**: Implement logic to generate `entityVersions` map from the current local database.
2.  **Meta Upload/Download**: Implement `RemotesService` methods to read/write `meta.json`.
3.  **Sync Logic v1**:
    - On Sync, download `meta.json`.
    - Compare with local state.
    - Log what _would_ be transferred. (Dry run).

### Phase 2: Entity-Aware Storage (The Split)

_Goal: Move away from single `main.json` to allow granular reads/writes._

1.  **Storage Adapter**: Create an abstraction that can read/write individual entities to the remote provider (e.g., `adapter.writeEntity('tasks', 'id', data)`).
2.  **Batching**: Ensure we don't fire 1000 HTTP requests. Use parallel uploads or zip batching if the provider supports it.

### Phase 3: The Sync Loop

1.  **Implement the Algorithm**: Connect the comparison logic to the Storage Adapter.
2.  **Conflict Handler**: Implement the field-level merge function.

### Phase 4: Cleanup

1.  **Disable Legacy Sync**: Remove the "overwrite whole file" logic.
2.  **UI Feedback**: Show precise sync status (e.g., "Synced 5 tasks").

## 6. Comparison with Operation Log

| Feature        | Per-Entity Delta Sync   | Operation Log                                                     |
| :------------- | :---------------------- | :---------------------------------------------------------------- |
| **Complexity** | Medium                  | Very High                                                         |
| **State**      | State-based (Snapshots) | Event-based (Sourcing)                                            |
| **History**    | Current state only      | Full history (theoretically)                                      |
| **Conflicts**  | Field-level merge       | Deterministic Replay / CRDT-like                                  |
| **Data Size**  | Proportional to state   | Proportional to _changes_ (grows indefinitely without compaction) |
| **Dev Time**   | ~2-3 Weeks              | ~3 Months                                                         |

## 7. Technical Risks & Mitigations

1.  **Remote Performance**: Many small files can be slow.
    - _Mitigation_: Use "Batch Files" (zip or grouped JSONs) for initial sync or large updates.
2.  **Atomicity**: What if `meta.json` updates but entity file upload fails?
    - _Mitigation_: Upload entities _first_, then update `meta.json` pointing to them. If meta update fails, the entities are "orphaned" but harmless (will be overwritten or referenced next time).
3.  **Race Conditions**: Two clients syncing at exact same time.
    - _Mitigation_: Optimistic locking on `meta.json` (using ETag or `If-Match` header if available), or a simple "lock file" mechanism.

## 8. Conclusion

The **Per-Entity Delta Sync** is the pragmatic choice for a single-user, multi-device scenario. It solves the data loss issue of the current implementation without incurring the engineering debt of a full event-sourcing system.

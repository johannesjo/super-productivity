# Per-Entity Delta Sync: Planning Document

## 1. Executive Summary

This document outlines the implementation plan for a **Per-Entity Delta Sync** mechanism. This approach is proposed as a lightweight, robust alternative to the complex "Operation Log" architecture. It addresses the core requirements of **data loss prevention**, **conflict minimization**, and **bandwidth efficiency** without the overhead of event sourcing, replay logic, or dual data models.

**Core Philosophy:** Keep the current snapshot-based model but make synchronization "entity-aware" rather than "file-aware". Use **Batched Deltas** to solve the "many small files" performance problem.

## 2. Problem Statement

The current "whole-file" sync approach suffers from:

1.  **Data Loss/Overwrites:** If two devices edit different tasks, the last write wins, overwriting the other device's changes to unrelated tasks.
2.  **Bandwidth Inefficiency:** Changing one character in a task requires re-uploading the entire database.
3.  **Conflict Rigidity:** Merging is difficult because the granularity is too coarse (the whole file).

The "Operation Log" proposal solves these but introduces complexity (replaying events) and features not currently required (audit trails).

## 3. Proposed Architecture: Per-Entity Delta Sync

### 3.1. Data Model Extensions

We track version metadata on every entity.

#### 3.1.1. Entity Metadata

Every syncable entity (Task, Project, Tag, Note) will implement a versioning interface:

```typescript
interface EntitySyncMetadata {
  id: string;
  // Monotonic counter, incremented on every local update
  version: number;
  // Timestamp of last update (wall clock, for informational/conflict heuristics)
  lastModifiedAt: number;
  // ID of the device that made the last change
  lastModifiedBy: string;
  // Deleted flag (soft delete is REQUIRED for delta sync)
  isDeleted?: boolean;
}
```

#### 3.1.2. Global Sync Metadata (`meta.json`)

Clients first check a lightweight `meta.json` on the remote provider.

```typescript
interface RemoteSyncMeta {
  // Map of EntityID -> Version.
  entityVersions: {
    [entityId: string]: number;
  };
  // Timestamp of the last successful sync
  lastSyncTimestamp: number;
  // Pointer to the "Base State" file (full backup)
  baseStateFile: string;
}
```

### 3.2. Batched Storage Strategy (The "Middle Way")

To avoid the performance penalty of thousands of small files (WebDAV latency) while maintaining delta capabilities:

1.  **Base State:** `main.json` (or `snapshot_TIMESTAMP.json`) exists as a fallback/bootstrap.
2.  **Delta Batches:** When a client syncs, it uploads a **single** JSON file containing _only_ the entities that changed.
    - Filename: `delta_{deviceId}_{timestamp}.json`
    - Content: `{ tasks: [TaskA, TaskB], projects: [ProjectX] }`
3.  **Compaction:** Periodically (e.g., every 10 deltas or once a week), a client downloads the Base + all Deltas, merges them, and uploads a new Base State, deleting old deltas.

### 3.3. Synchronization Algorithm

1.  **Local Change**:

    - User updates Task A.
    - App increments `TaskA.version`.
    - App updates local `meta.entityVersions['TaskA']`.

2.  **Sync Process (Initiator)**:
    - **Lock**: Acquire remote lock.
    - **Read Remote Meta**: Download `meta.json`.
    - **Diff**: Identify entities where `Remote.ver > Local.ver` (Incoming) and `Local.ver > Remote.ver` (Outgoing).
    - **Download Step (Incoming)**:
      - Identify which `delta_*.json` files contain the needed incoming entities (requires `meta.json` to map ID->File, or just download all new delta files since last sync).
      - **Apply Incoming**: Merge entities into local DB. **Apply in Topological Order** (Projects first, then Tasks) to satisfy dependencies.
    - **Upload Step (Outgoing)**:
      - Bundle all local dirty entities into **one** `delta_{myId}_{now}.json`.
      - Upload the file.
      - Update `meta.json` with new versions and add the new delta file to the list.
    - **Unlock**.

## 4. Cross-Model Relationships & Integrity

Unlike strict SQL databases, our client-side logic must handle referential integrity manually during the sync merge.

### 4.1. Dependency Order (Topological Apply)

When applying a batch of incoming changes, order matters.

1.  **Projects** (Must exist before Tasks assigned to them)
2.  **Tags** (Must exist before being referenced)
3.  **Tasks** (Parent tasks first, then Subtasks)
4.  **Notes** (Attached to Projects/Tasks)

_Implementation:_ The `applyDelta()` function must sort the incoming entities by type before upserting to IndexedDB.

### 4.2. Cascading Deletes (Client-Side Responsibility)

In an Operation Log, a "Delete Project" event triggers a reducer that deletes tasks. In Delta Sync, the **deleting client** acts as the reducer.

- **Scenario:** User deletes "Project A".
- **Client A Logic:**
  1.  Mark "Project A" as `isDeleted: true`.
  2.  Find all Tasks in "Project A".
  3.  **Update them:** Set `projectId = null` (Inbox) or mark `isDeleted: true` (depending on app policy).
  4.  Sync: Uploads a Delta containing { ProjectA (deleted), Task1 (updated), Task2 (updated) }.
- **Client B Logic:**
  1.  Receives the Delta.
  2.  Upserts the entities. "Project A" is removed/hidden. "Task 1" moves to Inbox.
  3.  _Benefit:_ Client B doesn't need complex cascade logic; it just trusts the state.

### 4.3. Orphan Handling

If Client B receives a Task pointing to "Project Z" which it doesn't have (e.g., partial sync failure or out-of-order arrival):

- **Soft Dependency (Tags):** Ignore the missing tag reference.
- **Hard Dependency (Parent Task):**
  - _Option 1:_ Queue the orphan until parent arrives.
  - _Option 2 (Simpler):_ Display as a top-level task until parent arrives (self-healing).

## 5. Conflict Resolution

Since we track versions per entity, conflicts are scoped to a single entity.

### 5.1. Entity-Level Conflict

- **Scenario:** Device A renames Task 1. Device B completes Task 1.
- **Resolution:** **Field-Level Merge**.
  - Result: Task 1 is renamed AND completed.
  - Version: `max(vA, vB) + 1`.

### 5.2. Relational Conflict (The "Zombie" Case)

- **Scenario:** Device A edits "Task 1" (in "Project X"). Device B deletes "Project X".
- **Result:**
  - Device A syncs: "Task 1" (v2) points to "Project X".
  - Device B syncs: "Project X" (deleted).
  - **Outcome:** "Task 1" is now an orphan (points to non-existent project).
- **Fix:** The App's "Consistency Check" (run on startup/sync completion) detects tasks pointing to missing projects and moves them to **Inbox**.

## 6. Implementation Plan

### Phase 0: Preparation

1.  **Data Audit:** Ensure `id` is stable.
2.  **Schema Update:** Add `version`, `lastModifiedAt`, `isDeleted` to `Task`, `Project`, `Tag`.

### Phase 1: The "Batched Delta" Storage

1.  **Delta Writer:** Create service to dump "dirty" entities to a JSON file.
2.  **Delta Reader:** Create service to read a JSON file and upsert entities to NgRx/IndexedDB.
3.  **Ordering Logic:** Ensure `DeltaReader` applies `Projects` -> `Tags` -> `Tasks`.

### Phase 2: The Sync Loop

1.  **Meta Sync:** Read/Write `meta.json` containing `entityVersions`.
2.  **Integration:** Hook into existing `sync.service.ts`. Replace "Overwrite All" with "Upload Delta + Update Meta".

### Phase 3: Integrity & Cleanup

1.  **Cascade Logic:** Ensure UI "Delete" actions explicitly update related entities (moving tasks to Inbox) before syncing.
2.  **Orphan Sweeper:** Implement a startup check to move orphaned tasks to Inbox.
3.  **Compaction:** Logic to merge `base.json` + `delta_1..10.json` -> new `base.json`.

## 7. Comparison vs Operation Log

| Feature        | Per-Entity Delta Sync               | Operation Log                          |
| :------------- | :---------------------------------- | :------------------------------------- |
| **State**      | **Smart Snapshots** (Current State) | **Events** (History of Actions)        |
| **Files**      | Base + Batched Deltas (Low Count)   | Many Op Files (High Count)             |
| **Logic**      | "Dumb" Merge (Trust the data)       | Replay Reducer (Calculate state)       |
| **Relations**  | Source Client calculates cascades   | Destination Client calculates cascades |
| **Conflict**   | Field-level merge + Last Write Wins | User Intent Preservation               |
| **Complexity** | **Medium**                          | **Very High**                          |

## 8. Conclusion

The **Batched Per-Entity Delta Sync** solves the bandwidth and data-loss problems while adhering to the "File Count" constraints. By shifting the responsibility of "Cascade Deletes" to the _source_ client (recording the effects, not the cause), we avoid the complexity of an Event Sourcing replay engine.

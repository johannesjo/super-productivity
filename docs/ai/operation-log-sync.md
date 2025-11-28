# Architecture V2: Operation Log & Event Sourcing

## 1. Executive Summary

**Goal:** Transition `super-productivity` from a state-snapshot sync model to an operation-based (event sourcing) model.

**Current Problems Solved:**

- **Data Loss/Overwrite:** "Last write wins" on the whole file level overwrites granular changes from other devices.
- **Performance:** Sync currently requires downloading full state and reloading the entire application (`reInit`).
- **Complexity:** Dual source of truth (NgRx vs. IndexedDB) causes state drift.

**New Paradigm:**

- **NgRx is the Single Source of Truth.**
- **Persistence is a Log of Operations.**
- **Sync is the Exchange of Operations.**

---

## 2. Core Data Structures

### 2.1. The Vector Clock

To handle causality and ordering in a distributed system without a central server authority.

```typescript
// Map of Client ID -> Counter
// e.g., { 'client_A': 15, 'client_B': 7 }
export type VectorClock = Record<string, number>;
```

### 2.2. The Operation Schema

All changes to the application state must be representable as a discrete operation.

```typescript
export enum OpType {
  Create = 'CRT',
  Update = 'UPD',
  Delete = 'DEL',
  Move = 'MOV', // For list reordering
}

export interface Operation {
  id: string; // UUID v4 (Unique Op ID)

  // ACTION MAPPING
  actionType: string; // Corresponds to the NgRx Action (e.g., '[Task] Update')

  // SCOPE
  entityType: 'TASK' | 'PROJECT' | 'TAG' | 'NOTE' | 'GLOBAL_CONFIG';
  entityId: string;

  // DATA (Delta)
  payload: any; // The partial update / diff

  // CAUSALITY & ORDERING
  clientId: string; // ID of the device generating the op
  vectorClock: VectorClock; // State of the world when Op was created
  timestamp: number; // Wall clock time (fallback for concurrent resolution)

  // META
  schemaVersion: number; // For future migrations
}
```

### 2.3. The Persistent Log Entry

How operations are stored in IndexedDB.

```typescript
export interface OperationLogEntry {
  seq: number; // Local, monotonic auto-increment (primary key for IndexedDB)
  op: Operation;
}
```

---

## 3. Architecture Layers

### 3.1. The Unified Flow

No more parallel paths for Sync and UI.

```mermaid
graph TD
    User[User Interaction] -->|Triggers| Action[NgRx Action]
    Action -->|Reducer| Store[NgRx Store (Memory)]

    Action -.->|Effect Filter| OpConverter[Op Converter]
    OpConverter -->|Write| OpLog[IndexedDB: OpLog]

    OpLog -->|Sync Upload| Cloud[Remote Storage]
    Cloud -->|Sync Download| RemoteOp[Remote Ops]

    RemoteOp -->|Dispatch| RemoteAction[NgRx Action (isRemote: true)]
    RemoteAction -->|Reducer| Store
```

### 3.2. The Action Contract (Whitelisting)

Not all NgRx actions should be persisted. We need an explicit contract.

```typescript
export interface PersistentAction extends Action {
  meta: {
    isPersistent: true; // MUST be true to be recorded
    entityType: string;
    entityId: string;
    isRemote?: boolean; // TRUE if this action came from Sync (prevents loops)
  };
  payload?: any;
}
```

---

## 4. Critical Workflows

### 4.1. The Write Path (Local User Action)

1.  User clicks "Complete Task".
2.  Component dispatches `TaskActions.update({ id, changes: { isDone: true } })`.
3.  **Reducer:** Updates memory state immediately (optimistic UI).
4.  **OperationLogEffects:**
    - Listens for actions with `meta.isPersistent: true`.
    - **Ignores** actions with `meta.isRemote: true`.
    - Converts Action → `Operation` object.
    - Generates new `VectorClock` (increments local counter).
    - Writes `Operation` to IndexedDB using **Web Locks** (to ensure sequence safety across tabs).

### 4.2. The Read Path (Startup)

Loading 50,000 operations is too slow. We use a **Rolling Snapshot** strategy.

1.  **Load Snapshot:** Fetch `StateCache` (full JSON dump) from IndexedDB.
    - _Optimization:_ This is equivalent to the current "database", but treated as a cache.
    - Contains: `lastAppliedOpVector`.
2.  **Init NgRx:** Hydrate the store with the Snapshot.
3.  **Replay Tail:** Query `OperationLog` for all ops where:
    - `op.vectorClock` > `StateCache.lastAppliedOpVector`.
4.  **Apply:** Dispatch these specific ops as actions to bring state to "Now".
5.  **Ready:** App initializes.

### 4.3. The Sync Path (Remote -> Local)

1.  **Download:** Sync Service fetches `ops_client-B.log`.
2.  **Filter:** Check against `appliedOps` (set of UUIDs in DB) to avoid duplicates.
3.  **Dispatch:** For every new operation:
    - Convert Op → Action.
    - Add `meta: { isRemote: true }`.
    - Dispatch to NgRx.
4.  **Effect:** `OperationLogEffects` sees `isRemote: true` and **DOES NOT** log it again.
5.  **Ack:** Mark Op ID as applied in DB.

### 4.4. Concurrency (Multi-Tab)

We use the **Web Locks API** (`navigator.locks`) to ensure atomic writes to the Operation Log.

```typescript
navigator.locks.request('op_log_write', async (lock) => {
  // 1. Get last Sequence
  // 2. Write Op
  // 3. Update Vector Clock
});
```

### 4.5. Compaction (Garbage Collection)

To prevent the log from growing infinitely.

- **Trigger:** Every $N$ operations (e.g., 500) or on App Close.
- **Process:**
  1.  Take current NgRx State.
  2.  Write to `StateCache` in IndexedDB.
  3.  Delete all operations in `OperationLog` that are strictly _older_ than the state's vector clock.
- **Result:** Fast startup is maintained.

---

## 5. Migration Strategy

**Scenario:** User updates from v9 (Files) to v10 (Ops).

1.  **Detection:** `OperationLog` is empty, but legacy `task` / `project` keys exist in IndexedDB.
2.  **Genesis Op:**
    - Create a special operation: `Type: GENESIS_IMPORT`.
    - Payload: The entire content of the old legacy state.
3.  **Execution:**
    - Write Genesis Op to log.
    - Mark legacy keys as "Migrated" (or delete).
4.  **Result:** The system treats the existing data as one giant "initial create" operation.

---

## 6. Risks & Mitigations

| Risk                    | Mitigation                                                                    |
| :---------------------- | :---------------------------------------------------------------------------- |
| **Infinite Loops**      | Strict usage of `isRemote` flag in Action metadata.                           |
| **Startup Slowness**    | Aggressive Compaction + Snapshotting strategy.                                |
| **Lost Updates (Tabs)** | Web Locks API for all DB writes.                                              |
| **Data Bloat**          | Whitelist only essential state-changing actions (ignore UI toggles).          |
| **Ordering Glitches**   | Vector Clocks + Deterministic Sort (Timestamp + ClientID) for concurrent ops. |

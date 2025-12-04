# Plan: Operation Log & Archive Synchronization

## Problem Analysis

1.  **Time Tracking Frequency:** `addTimeSpent` fires every second. Persisting this directly would flood the operation log and network.
2.  **Time Tracking Divergence:** Currently, time tracking is not synced at all.
3.  **Archive Divergence:** `moveToArchive` syncs the task removal but fails to move the associated "Worklog" (Time Tracking) data to the archive on remote clients.
4.  **Archive Consistency:** `ArchiveYoung` and `ArchiveOld` are derived states. We need to ensure they evolve deterministically on all clients to avoid massive file syncs.

## Goals

1.  Sync time tracking efficiently (batching).
2.  Ensure `ArchiveYoung` is correctly updated on remote clients during `moveToArchive`.
3.  Leverage the rarity of `ArchiveOld` updates.

## Implementation Steps

### 1. Efficient Time Tracking Sync (Batching)

We will implement a "Batch Sync" pattern. The UI continues to update every second via the existing local `addTimeSpent` action. A new persistent action will handle the sync.

- **New Action:** `TimeTrackingActions.saveTimeSpentBatch`

  - Props: `{ task: Task, date: string, duration: number }`
  - Meta: `{ isPersistent: true, entityType: 'TASK', entityId: task.id, opType: 'UPD' }`

- **Logic Update (`TaskService`):**

  - Maintain a local accumulator `_unsyncedDuration`.
  - Subscribe to `tick$`.
  - On every tick:
    - Dispatch `addTimeSpent` (Local, existing).
    - `_unsyncedDuration += tick.duration`.
  - Every **1 minute** (and when task stops):
    - If `_unsyncedDuration > 0`:
      - Dispatch `saveTimeSpentBatch({ duration: _unsyncedDuration, ... })`.
      - Reset `_unsyncedDuration = 0`.

- **Reducer Updates (`TaskReducer` & `TimeTrackingReducer`):**
  - Handle `TimeTrackingActions.saveTimeSpentBatch`.
  - **Crucial:** Check `action.meta.isRemote`.
    - If `false` (Local dispatch): **Ignore** (Return state as is). The local `addTimeSpent` actions have already updated the state second-by-second.
    - If `true` (Remote dispatch): **Apply**. Add the duration to `timeSpent` and `worklog`.

### 2. Fix Remote Archive Handling (`ArchiveYoung`)

Remote clients receiving `moveToArchive` currently only move Tasks to `ArchiveYoung`. They must also move the corresponding time tracking data.

- **File:** `src/app/features/time-tracking/archive.service.ts`
- **Function:** `writeTasksToArchiveForRemoteSync(tasks)`
- **Logic Update:**
  1.  Load `TimeTrackingState` (Active) and `ArchiveYoung` (Model).
  2.  Use `sortTimeTrackingDataToArchiveYoung` (existing util) to partition the time data for the archived tasks.
  3.  **Update `ArchiveYoung`:** Save the partitioned "old" time data into the `ArchiveYoung` model.
  4.  **Update Active State:** Dispatch `TimeTrackingActions.updateWholeState` with the remaining "active" time data (stripping out the archived days).

### 3. Smart Handling for ArchiveOld

Since `ArchiveOld` is written to rarely, we will treat the _Action of Flushing_ as the synced event, rather than the data itself.

- **Deterministic Flush:** The trigger to flush tasks from `ArchiveYoung` to `ArchiveOld` is currently local (based on time thresholds).
- **New Strategy:**
  - When Client A triggers a flush, it emits a new operation: `ArchiveActions.flushYoungToOld`.
  - Client B receives this op.
  - Client B executes the _exact same logic_: loads its `ArchiveYoung`, moves items to its `ArchiveOld`, saves both.
  - **Benefit:** No massive file transfer. Both clients maintain their own `ArchiveOld` files consistent via deterministic replay of the flush operation.
  - **Prerequisite:** `ArchiveYoung` must be consistent on both sides (handled by Step 2).

## Verification Plan

1.  **Time Tracking:** Verify 1-minute batch syncing between clients.
2.  **Archive Young:** Verify archiving a task on Client A removes its old worklogs on Client B.
3.  **Archive Old:** Trigger a flush on Client A (mock threshold) and verify Client B also moves items to its `ArchiveOld`.

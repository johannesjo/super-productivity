# Sync Architecture Comparison: Delta Sync vs. Operation Log

**Model:** gemini-2.5-flash
**Date:** December 2, 2025

## 1. Overview

This comparison evaluates two distinct synchronization paradigms for Super Productivity:

1.  **Delta Sync (SuperSync):** A state-based approach relying on `Current - Shadow` diffing.
2.  **Operation Log:** An event-based approach (Event Sourcing) relying on recording and replaying user actions.

---

## 2. Detailed Comparison

| Criteria                  | Delta Sync (State-Based)                                                                                                                  | Operation Log (Event-Based)                                                                                          | Advantage                                                     |
| :------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------ |
| **Sync Speed**            | **High Latency.** Must calculate diffs (CPU heavy) before network request. Fast _download_ if diffs are small.                            | **Low Latency.** Operations are pre-calculated and appended instantly. Upload is O(1).                               | **OpLog**                                                     |
| **Disk Usage**            | **Heavy.** Requires storing `Local State` + `Shadow State` (2x storage multiplier).                                                       | **Cumulative.** Stores `Local State` + `Op Log`. Log requires compaction (garbage collection) to stay small.         | **Delta** (Short term)<br>**OpLog** (Long term w/ compaction) |
| **Maintainability**       | **Low.** "Diffing" logic is brittle. Maintaining `Shadow State` persistence is a common source of bugs.                                   | **High.** Uses standard NgRx Actions. Debugging is easier because the "History" is explicit and readable.            | **OpLog**                                                     |
| **Conflict Handling**     | **Destructive (LWW).** "Last Write Wins" blindly overwrites data. No context of _why_ a change happened.                                  | **Constructive.** Semantic merging. A `TaskCompleted` op and `TaskRenamed` op can both be applied without conflict.  | **OpLog**                                                     |
| **Robustness**            | **Fragile.** If Shadow State corrupts, the client is broken until full reset.                                                             | **Resilient.** Append-only logs are inherently hard to corrupt. Rebuilding state is deterministic (Replay).          | **OpLog**                                                     |
| **Large Datasets**        | **Poor.** Diffing 10k items freezes UI. Performance degrades linearly with data size.                                                     | **Excellent.** Performance depends on _change frequency_, not total data size.                                       | **OpLog**                                                     |
| **Implementation Status** | **Non-Existent (Phase -1).** Code analysis reveals the Server has **NO** delta DB (only Users table) and Client is just a WebDAV wrapper. | **Active (Phase 1).** Core logic (`OperationLogSyncService`) is implemented, integrated, and technically functional. | **OpLog**                                                     |

---

## 3. Strategic Recommendation

**Abandon State-Based Delta Sync.**

The code analysis confirms that the **Delta Sync** implementation is effectively "vaporware":

- **Server:** `db.ts` only contains a `users` table. There is no schema for storing changes/deltas. `api.ts` has no sync routes.
- **Client:** `SuperSyncProvider` is a shell wrapping WebDAV.
- **Operation Log:** By contrast, the `OperationLogSyncService` is fully implemented with chunking, conflict detection, and manifest management.

**Path Forward:**
Focus all engineering effort on hardening the **Operation Log** implementation. Trying to revive Delta Sync would require writing the entire sync engine (Client & Server) from scratch.

---

## 4. Estimation & Implementation Plan

### Option A: Build Delta Sync (The "From Scratch" Path)

**Goal:** Build the entire Delta Sync ecosystem (Server DB + API, Client Shadow DB + Diff Engine).

**Estimation:** **12-16 Weeks** (Extreme Risk)

- **Server (4-6 wks):** Design `changes` schema, implement `/api/sync` endpoints, robust LWW logic, Auth integration.
- **Client (6-8 wks):** Implement `ShadowStateStore` (IndexedDB), Diff Engine (Worker), Partial Patching, Conflict UI.
- **Migration (2 wks):** Logic to migrate existing WebDAV users to Delta Server.

### Option B: Harden Operation Logs (The "Finish It" Path)

**Goal:** Polish the existing `OperationLogSyncService` for production release.

**Estimation:** **3-4 Weeks** (Low Risk)

- **Compaction Strategy (Wk 1):** Implement "Snapshots". Every N ops, save full state to `snapshot.json` and delete old ops (Foundations exist in `OperationLogStore`).
- **Startup Hydration (Wk 2):** Optimize app startup to load `Last Snapshot + Tail Ops` instead of replaying history from zero.
- **Genesis Migration (Wk 3):** Create a "Genesis Op" generator to convert existing user data into the first Operation Log entry for seamless migration.
- **Effect Guard (Wk 4):** Ensure replaying operations (e.g., "Task Completed") does not trigger side effects (Notification sounds, API calls) during sync.

# Hybrid Manifest & Snapshot Architecture for File-Based Sync

**Status:** Proposal / Planned
**Context:** Optimizing WebDAV/Dropbox sync for the Operation Log architecture.

---

## 1. The Problem

The current `OperationLogSyncService` fallback for file-based providers (WebDAV, Dropbox) is inefficient for frequent, small updates.

**Current Workflow (Naive Fallback):**

1.  **Write Operation File:** Upload `ops/ops_CLIENT_TIMESTAMP.json`.
2.  **Read Manifest:** Download `ops/manifest.json` to get current list.
3.  **Update Manifest:** Upload new `ops/manifest.json` with the new filename added.

**Issues:**

- **High Request Count:** Minimum 3 HTTP requests per sync cycle.
- **File Proliferation:** Rapidly creates thousands of small files, degrading WebDAV directory listing performance.
- **Latency:** On slow connections (standard WebDAV), this makes sync feel sluggish.

## 2. Proposed Solution: Hybrid Manifest

Instead of treating the manifest solely as an _index_ of files, we treat it as a **buffer** for recent operations.

### 2.1. Concept

- **Embedded Operations:** Small batches of operations are stored directly inside `manifest.json`.
- **Lazy Flush:** New operation files (`ops_*.json`) are only created when the manifest buffer fills up.
- **Snapshots:** A "base state" file allows us to delete old operation files and clear the manifest history.

### 2.2. New Data Structures

**Updated Manifest:**

```typescript
interface HybridManifest {
  version: number; // e.g., 2

  // The baseline state (snapshot). If present, clients load this first.
  lastSnapshot?: {
    fileName: string; // e.g. "snapshots/state_v1_170123.json"
    serverSeq: number; // The max sequence number included in this snapshot
    timestamp: number;
  };

  // Ops stored directly in the manifest (The Buffer)
  // Limit: ~50 ops or 100KB
  embeddedOperations: Operation[];

  // References to external operation files (The Overflow)
  // Older ops that were flushed out of the buffer
  operationFiles: string[];
}
```

## 3. Workflows

### 3.1. Upload (Write Path)

When a client has local pending operations to sync:

1.  **Lock & Read:** Acquire remote lock (if applicable) and download `manifest.json`.
2.  **Evaluate Buffer:**
    - Check size of `manifest.embeddedOperations`.
    - Check size of `pendingOps`.
3.  **Strategy Selection:**
    - **Scenario A (Standard):** If `manifest.embedded + pending < THRESHOLD`:
      - Append pending ops to `manifest.embeddedOperations`.
      - **Result:** 1 Write (Manifest). 0 New files.
    - **Scenario B (Overflow):** If buffer is full:
      - Move _existing_ `embeddedOperations` into a new external file (e.g., `ops/overflow_TIMESTAMP.json`).
      - Add that new filename to `manifest.operationFiles`.
      - Place _new_ `pendingOps` into the now-empty `manifest.embeddedOperations`.
      - **Result:** 1 Upload (Overflow) + 1 Write (Manifest).
4.  **Write:** Upload updated `manifest.json`.

### 3.2. Download (Read Path)

When a client checks for updates:

1.  **Read Manifest:** Download `manifest.json`.
2.  **Check Snapshot:**
    - If `manifest.lastSnapshot` is newer than local data, download and apply the snapshot file first.
3.  **Process Files:**
    - Download and apply any files in `manifest.operationFiles` that haven't been seen yet.
4.  **Process Embedded:**
    - Apply operations found in `manifest.embeddedOperations`.

## 4. Snapshotting (Compaction)

To prevent the "chain" of operation files from growing forever, any client can trigger a snapshot.

**Trigger:**

- Total external `operationFiles` count > 50.
- OR Total distinct operations in history > 5000.

**Process:**

1.  **Download Everything:** Ensure the client has the full, consistent state.
2.  **Generate Snapshot:** Serialize the current `AppDataComplete` to a file (e.g., `snapshots/snap_SEQ_TIMESTAMP.json`).
3.  **Upload Snapshot:** Upload the new snapshot file.
4.  **Update Manifest:**
    - Set `lastSnapshot` to the new file.
    - **Clear** `operationFiles` (delete the old JSON files from the server to save space).
    - **Clear** `embeddedOperations`.
5.  **Cleanup:** (Async) Delete the obsolete snapshot files and old operation files from the server.

## 5. Advantages

| Metric                  | Old Approach                         | New Approach                                           |
| :---------------------- | :----------------------------------- | :----------------------------------------------------- |
| **Requests per Sync**   | 3 (Upload Op + Read Man + Write Man) | **2** (Read Man + Write Man)                           |
| **Files on Server**     | 1 per sync (Unlimited growth)        | **Bounded** (1 Manifest + ~0-50 Op Files + 1 Snapshot) |
| **Fresh Install Speed** | Slow (Replay thousands of JSONs)     | **Fast** (Download 1 Snapshot + recent delta)          |
| **Conflict Handling**   | Same (Vector Clocks)                 | Same (Vector Clocks)                                   |

## 6. Implementation Plan

1.  **Modify `OperationLogSyncService`:**
    - Update `_loadRemoteManifest` to handle v2 format.
    - Refactor `_uploadPendingOpsViaFiles` to implement the buffer/overflow logic.
2.  **Add Snapshot Logic:**
    - Create `OperationLogSnapshotService` to handle generating and hydrating from the large snapshot files.
    - Add simple heuristic to `sync.service` to decide when to snapshot.
3.  **Migration:**
    - When a v2 client sees a v1 manifest, it should automatically "upgrade" it (move existing files to `operationFiles` list and add version tag).

# Operation Log: Design Rules & Guidelines

This document establishes the core rules and principles for designing the Operation Log store and defining new Operations. Adherence to these rules ensures data integrity, synchronization reliability, and system performance.

## 1. Store Design Rules

### 1.1 Append-Only Persistence

- **Rule:** The `ops` table in the store must be strictly **append-only** for active operations.
- **Reasoning:** History preservation is critical for event sourcing and conflict resolution.
- **Exception:** Operations can only be deleted by the **Compaction Service**, and only if they are:
  1.  Older than the retention window.
  2.  Successfully synced (`syncedAt` is set).
  3.  "Baked" into a secure snapshot.

### 1.2 Immutable History

- **Rule:** Once an operation is written to `SUP_OPS`, it **MUST NOT** be modified.
- **Reasoning:** Modifying history breaks the cryptographic chain (if implemented later) and confuses sync peers who have already received the operation.
- **Correction:** If an operation was incorrect, append a new _compensating operation_ (e.g., an undo or correction op) rather than editing the old one.

### 1.3 Single Source of Truth

- **Rule:** The Operation Log (`SUP_OPS`) is the ultimate source of truth for the application state.
- **Context:** The `state_cache` and runtime NgRx store are _projections_ derived from the log.
- **Implication:** If the runtime state disagrees with the log replay, the log wins.

### 1.4 Snapshot Mandate

- **Rule:** The store must maintain a valid `state_cache` (snapshot).
- **Frequency:** Snapshots must be updated based on configurable thresholds:
  - **Operation count:** After N operations (default: 500, configurable).
  - **Time-based:** After T minutes of inactivity following changes.
  - **Size-based:** When tail ops exceed S kilobytes.
  - **Event-triggered:** Immediately after significant events (large imports, sync completion).
- **Recovery:** The system must be able to rebuild the state entirely from `Snapshot + Tail Ops`.

## 2. Operation Design Rules

### 2.1 Granularity & Atomicity

- **Rule:** Operations should be **atomic** and focused on a **single entity** where possible.
- **Good:** `UPDATE_TASK { id: "A", changes: { title: "New" } }`
- **Bad:** `UPDATE_ALL_TASKS { [ ... entire tasks array ... ] }`
- **Reasoning:** Granular ops reduce conflict probability. Large "dump" ops cause massive conflicts during sync.
- **Exception:** `SYNC_IMPORT` and `BACKUP_IMPORT` are allowed to replace large chunks of state but must be treated as special "reset" events.

### 2.2 Idempotency

- **Rule:** Applying the same operation twice must be safe.
- **Implementation:**
  - Use explicit IDs (UUID v7) for creation. `CREATE` with an existing ID must be **ignored** (not merged or updated). If updates are needed, a separate `UPDATE` operation must follow.
  - `DELETE` on a missing entity should be a no-op.
  - `UPDATE` on a missing entity should be queued for retry (see 3.4 Dependency Awareness).

### 2.3 Serializable Payload

- **Rule:** Operation payloads must be **Pure JSON**.
- **Forbidden:**
  - `Date` objects (use `timestamp` numbers).
  - Functions or class instances.
  - `undefined` (use `null` or omit the key, depending on semantics).
  - Circular references.

### 2.4 Causality Tracking

- **Rule:** Every operation **MUST** carry a `vectorClock`.
- **Purpose:** To determine if the operation is concurrent with others or if it causally follows them.
- **Responsibility:** The `OperationLogEffects` (or equivalent creator) captures the clock at the moment of creation.

### 2.5 Schema Versioning

- **Rule:** Every operation **MUST** carry a `schemaVersion`.
- **Purpose:** To allow future versions of the app to migrate or interpret old operations correctly.
- **Default:** Use `CURRENT_SCHEMA_VERSION` from `SchemaMigrationService` at the time of creation.

### 2.6 Explicit Intent (OpType)

- **Rule:** Use specific `OpType`s (`CRT`, `UPD`, `DEL`, `MOV`) rather than a generic `CHANGE`.
- **Reasoning:** Specific types allow for smarter conflict resolution and UI feedback (e.g., "Task was deleted remotely" vs "Task was moved").

## 3. Interaction & Safety Rules

### 3.1 Validation First

- **Rule:** Validate operation payloads **before** appending to the log.
- **Checkpoint:** Structural validation (required fields) happens at the boundary. Deep semantic validation happens during application/replay.
- **Failure:** Reject malformed operations immediately; do not corrupt the log.

### 3.2 Robust Replay

- **Rule:** The replay mechanism (Hydrator) **MUST NOT CRASH** on invalid operations.
- **Behavior:** If an operation fails to apply (e.g., referencing a missing parent):
  1.  Log a warning.
  2.  Skip the operation (or queue for retry).
  3.  Continue replaying the rest.
  4.  Trigger a `REPAIR` cycle at the end if needed.

### 3.3 Sync Isolation

- **Rule:** The `OperationLogStore` should not contain logic specific to a sync provider (Dropbox, WebDAV).
- **Separation:** The store manages _persistence_. The Sync Services manage _transport_.
- **Interface:** The store exposes `getUnsynced()`, `markSynced()`, `markRejected()` as generic methods.

### 3.4 Dependency Awareness

- **Rule:** Operations creating dependent entities (e.g., Subtask) must ensure the dependency (Parent Task) exists.
- **Handling:** If a parent is missing during sync, the child creation op should be buffered in a `DependencyQueue` until the parent arrives.
- **Safeguards:**
  - **Cycle detection:** Before queuing, verify the dependency graph is acyclic. Reject operations that would create circular dependencies.
  - **Buffer limits:** The queue must enforce a maximum depth (default: 1000 pending ops) and timeout (default: 5 minutes). Operations exceeding limits should be logged and dropped.
  - **Retry policy:** Queued operations should be retried after each batch of new operations is applied, with exponential backoff for repeated failures.

### 3.5 Deletion & Tombstones

> **Status (December 2025):** Tombstones are **DEFERRED**. After comprehensive evaluation, the current event-sourced architecture provides sufficient safeguards without explicit tombstones. See `todo.md` Item 1 for the full evaluation.

- **Current Implementation:** Deletions use **DELETE operations** in the event log (immutable events, not destructive).
- **Alternative Safeguards in Place:**
  - Vector clocks detect concurrent delete+update conflicts; user resolution UI is presented.
  - Tag sanitization filters non-existent taskIds at reducer level.
  - Subtask cascading deletes include all child tasks.
  - Auto-repair removes orphaned references and creates REPAIR operations.
- **When to Revisit:**
  - If undo/restore functionality is needed.
  - If audit compliance requires explicit "entity deleted at time X" records.
  - If cross-version sync (A.7.11) reveals edge cases not handled by current safeguards.

### 3.6 Operation Batching

- **Rule:** Normal operations should be batched with reasonable limits.
- **Limits:**
  - **Max batch size:** 100 operations per batch for normal sync uploads.
  - **Max payload size:** 1 MB per batch to prevent timeout issues.
- **Exception:** `SYNC_IMPORT` and `BACKUP_IMPORT` bypass these limits but must be clearly marked as bulk operations and trigger immediate snapshot creation afterward.

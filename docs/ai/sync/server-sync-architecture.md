# Server Sync Architecture (Part C)

**Status:** Not Started - Future Work
**Prerequisites:** Parts A & B must be complete
**Last Updated:** December 2, 2025

---

## Overview

Server sync represents a fundamental shift from legacy file-based sync to **operation-based sync**. Instead of uploading full state snapshots, each client uploads individual operations. The server becomes the coordination point for merging operations across devices.

### Goals

1. **Real-time sync** - Changes propagate within seconds, not minutes
2. **Offline-first** - Full functionality without connectivity
3. **Entity-level conflicts** - Granular conflict detection vs file-level
4. **Bandwidth efficiency** - Sync only deltas, not full state
5. **Audit trail** - Server retains operation history
6. **Scalability** - Support thousands of operations per user

### Non-Goals (for initial implementation)

- Real-time collaboration (multiple users, same account)
- Selective sync (partial data sets)
- End-to-end encryption (defer to existing solution)
- Conflict-free replicated data types (CRDTs) - too complex for initial version

---

## How Server Sync Differs from Legacy Sync

| Aspect                   | Legacy Sync (Part B)              | Server Sync (Part C)               |
| ------------------------ | --------------------------------- | ---------------------------------- |
| **Transport**            | File providers (WebDAV, Dropbox)  | REST API / WebSocket               |
| **What syncs**           | Full state snapshot (~5MB)        | Individual operations (~1KB each)  |
| **Conflict granularity** | File-level (entire dataset)       | Entity-level (single task/project) |
| **Detection method**     | Vector clock comparison           | Per-operation causality            |
| **Resolution**           | Last-write-wins (LWW)             | Merge strategies per entity type   |
| **Op-log role**          | Bridge only (vector clock update) | IS the sync mechanism              |
| **Sync frequency**       | Manual/periodic (minutes)         | Near real-time (seconds)           |
| **Server requirement**   | None (peer-to-peer via files)     | Required (coordination point)      |
| **Deletion handling**    | Implicit (missing = deleted)      | Explicit tombstones                |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client A                                        │
│  ┌─────────────┐    ┌─────────────────┐    ┌───────────────────────────┐    │
│  │  NgRx Store │───►│ OpLogEffects    │───►│ SUP_OPS (IndexedDB)       │    │
│  │  (runtime)  │    │ (capture)       │    │ ├─ ops (pending + synced) │    │
│  └─────────────┘    └─────────────────┘    │ └─ state_cache            │    │
│                                             └───────────┬───────────────┘    │
│                                                         │                    │
│                                          ┌──────────────▼───────────────┐    │
│                                          │ ServerSyncService            │    │
│                                          │ ├─ uploadPendingOps()        │    │
│                                          │ ├─ downloadRemoteOps()       │    │
│                                          │ └─ maintainConnection()      │    │
│                                          └──────────────┬───────────────┘    │
└─────────────────────────────────────────────────────────┼────────────────────┘
                                                          │
                                               ┌──────────▼──────────┐
                                               │   Server            │
                                               │   ├─ REST API       │
                                               │   ├─ WebSocket Hub  │
                                               │   ├─ Op Store (DB)  │
                                               │   └─ Conflict Svc   │
                                               └──────────┬──────────┘
                                                          │
┌─────────────────────────────────────────────────────────┼────────────────────┐
│                              Client B                    │                    │
│                                          ┌───────────────▼──────────────┐    │
│                                          │ ServerSyncService            │    │
│                                          │ └─ receives remote ops       │    │
│                                          └───────────────┬──────────────┘    │
│                                                          │                    │
│  ┌─────────────┐    ┌─────────────────┐    ┌────────────▼──────────────┐    │
│  │  NgRx Store │◄───│ OpApplier       │◄───│ SUP_OPS (IndexedDB)       │    │
│  │  (runtime)  │    │ (replay)        │    │ (stores with isRemote)    │    │
│  └─────────────┘    └─────────────────┘    └───────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Client-Side: Extended Operation Structure

```typescript
interface Operation {
  // Identity
  id: string; // UUID v7 (time-ordered, globally unique)
  clientId: string; // Device identifier

  // Classification
  actionType: string; // NgRx action type (for replay)
  opType: OpType; // CRT | UPD | DEL | MOV | BATCH
  entityType: EntityType; // TASK | PROJECT | TAG | etc.

  // Target
  entityId?: string; // Single entity operations
  entityIds?: string[]; // Batch operations

  // Data
  payload: unknown; // Action payload (partial update for UPD)
  prevPayload?: unknown; // Previous state (for conflict resolution)

  // Causality
  vectorClock: VectorClock; // { [clientId]: sequenceNumber }
  timestamp: number; // Wall clock (epoch ms) - for LWW tiebreaker
  parentOpId?: string; // Direct parent operation (for ordering)

  // Metadata
  schemaVersion: number; // For migrations
  serverSeq?: number; // Assigned by server after upload
}

type OpType =
  | 'CRT' // Create entity
  | 'UPD' // Update entity (partial)
  | 'DEL' // Delete entity (tombstone)
  | 'MOV' // Move entity (change parent/order)
  | 'BATCH' // Multiple entities
  | 'SYNC_IMPORT' // Full state import (from legacy/backup)
  | 'TOMBSTONE_CLEANUP'; // Periodic tombstone removal

interface OperationLogEntry {
  seq: number; // Local auto-increment
  op: Operation;
  appliedAt: number; // When applied locally
  source: 'local' | 'remote';

  // Sync state
  syncStatus: 'pending' | 'uploading' | 'synced' | 'failed';
  syncedAt?: number; // When server acknowledged
  syncError?: string; // Last error message
  retryCount: number; // For exponential backoff
}
```

### Server-Side Storage

```typescript
// Primary operation store
interface ServerOperation {
  // Server-assigned identity
  serverSeq: number; // Global monotonic sequence
  userId: string; // Account owner

  // Client operation (immutable after receipt)
  op: Operation;
  receivedAt: number;

  // Processing state
  status: 'accepted' | 'conflict' | 'rejected';
  conflictsWith?: string[]; // IDs of conflicting ops
  resolution?: ConflictResolution;

  // Indexing
  entityIndex: string; // `${entityType}:${entityId}` for fast lookup
}

// Conflict tracking
interface ConflictResolution {
  conflictId: string;
  strategy: 'clean_merge' | 'auto_merge' | 'lww' | 'manual' | 'rejected';
  resolvedBy: 'server' | string; // 'server' or clientId
  resolvedAt: number;
  winningOpId: string;
  mergedPayload?: unknown; // For auto_merge
  userChoice?: 'local' | 'remote' | 'merged';
}

// Entity state cache (for fast snapshot generation)
interface EntityStateCache {
  entityType: EntityType;
  entityId: string;
  userId: string;
  currentState: unknown;
  lastOpSeq: number;
  isDeleted: boolean;
  deletedAt?: number;
}

// Tombstone for deleted entities
interface Tombstone {
  entityType: EntityType;
  entityId: string;
  userId: string;
  deletedAt: number;
  deletedByOpId: string;
  expiresAt: number; // When tombstone can be cleaned up
}
```

### Vector Clock Management

```typescript
type VectorClock = Record<string, number>;

// Client maintains its own clock
class VectorClockService {
  private clock: VectorClock = {};
  private clientId: string;

  increment(): VectorClock {
    this.clock[this.clientId] = (this.clock[this.clientId] ?? 0) + 1;
    return { ...this.clock };
  }

  merge(remote: VectorClock): void {
    for (const [clientId, seq] of Object.entries(remote)) {
      this.clock[clientId] = Math.max(this.clock[clientId] ?? 0, seq);
    }
  }

  // Prune old clients to prevent unbounded growth
  prune(activeClients: Set<string>, maxAge: number): void {
    const now = Date.now();
    for (const clientId of Object.keys(this.clock)) {
      if (!activeClients.has(clientId)) {
        // Keep for maxAge, then remove
        // Server tracks which clients are active
      }
    }
  }
}
```

---

## Sync Protocol

### 1. Upload Flow

```typescript
class UploadService {
  private readonly BATCH_SIZE = 50;
  private readonly MAX_RETRIES = 5;
  private readonly BASE_RETRY_DELAY = 1000; // ms

  async uploadPendingOps(): Promise<UploadResult> {
    const pending = await this.opLogStore.getOpsWhere({
      syncStatus: 'pending',
    });

    if (pending.length === 0) {
      return { uploaded: 0, failed: 0 };
    }

    let uploaded = 0;
    let failed = 0;

    // Upload in order-preserving batches
    for (let i = 0; i < pending.length; i += this.BATCH_SIZE) {
      const batch = pending.slice(i, i + this.BATCH_SIZE);

      // Mark as uploading (prevents duplicate uploads)
      await this.opLogStore.updateStatus(
        batch.map((e) => e.op.id),
        'uploading',
      );

      try {
        const response = await this.serverApi.uploadOps({
          ops: batch.map((e) => e.op),
          clientId: this.clientId,
          lastKnownServerSeq: await this.opLogStore.getLastServerSeq(),
        });

        // Process results
        for (const result of response.results) {
          const entry = batch.find((e) => e.op.id === result.opId);
          if (!entry) continue;

          if (result.accepted) {
            await this.handleAccepted(entry, result);
            uploaded++;
          } else if (result.conflict) {
            await this.handleConflict(entry, result.conflict);
            // Don't count as failed - will resolve
          } else if (result.rejected) {
            await this.handleRejected(entry, result.reason);
            failed++;
          }
        }

        // Merge any new remote ops included in response
        if (response.newRemoteOps?.length) {
          await this.applyRemoteOps(response.newRemoteOps);
        }
      } catch (error) {
        await this.handleUploadError(batch, error);
        failed += batch.length;
      }
    }

    return { uploaded, failed };
  }

  private async handleAccepted(
    entry: OperationLogEntry,
    result: AcceptedResult,
  ): Promise<void> {
    await this.opLogStore.updateEntry(entry.op.id, {
      syncStatus: 'synced',
      syncedAt: Date.now(),
      retryCount: 0,
      op: { ...entry.op, serverSeq: result.serverSeq },
    });
  }

  private async handleUploadError(
    batch: OperationLogEntry[],
    error: Error,
  ): Promise<void> {
    for (const entry of batch) {
      const newRetryCount = entry.retryCount + 1;

      if (newRetryCount >= this.MAX_RETRIES) {
        await this.opLogStore.updateEntry(entry.op.id, {
          syncStatus: 'failed',
          syncError: error.message,
          retryCount: newRetryCount,
        });
        this.notifyUser(`Sync failed for operation: ${entry.op.actionType}`);
      } else {
        // Exponential backoff
        const delay = this.BASE_RETRY_DELAY * Math.pow(2, newRetryCount);
        await this.opLogStore.updateEntry(entry.op.id, {
          syncStatus: 'pending',
          syncError: error.message,
          retryCount: newRetryCount,
        });
        this.scheduleRetry(delay);
      }
    }
  }
}
```

### 2. Download Flow

```typescript
class DownloadService {
  async downloadRemoteOps(): Promise<DownloadResult> {
    const lastServerSeq = await this.opLogStore.getLastServerSeq();

    const response = await this.serverApi.getOps({
      sinceSeq: lastServerSeq,
      excludeClientId: this.clientId,
      limit: 1000,
    });

    if (response.ops.length === 0) {
      return { applied: 0, conflicts: 0 };
    }

    let applied = 0;
    let conflicts = 0;

    // Apply in server sequence order
    for (const serverOp of response.ops) {
      // Check for conflicts with local pending ops
      const localConflict = await this.detectLocalConflict(serverOp.op);

      if (localConflict) {
        await this.resolveLocalConflict(localConflict, serverOp);
        conflicts++;
      } else {
        await this.applyRemoteOp(serverOp);
        applied++;
      }
    }

    // Update vector clock with remote knowledge
    this.vectorClockService.merge(response.latestVectorClock);

    // Check if more ops available
    if (response.hasMore) {
      // Schedule immediate follow-up
      this.scheduleDownload(0);
    }

    return { applied, conflicts };
  }

  private async applyRemoteOp(serverOp: ServerOperation): Promise<void> {
    // 1. Store in local op log
    await this.opLogStore.appendOperation({
      op: serverOp.op,
      source: 'remote',
      syncStatus: 'synced',
      syncedAt: Date.now(),
      retryCount: 0,
    });

    // 2. Update last known server sequence
    await this.opLogStore.setLastServerSeq(serverOp.serverSeq);

    // 3. Apply to NgRx (isRemote=true prevents re-logging)
    await this.operationApplier.apply(serverOp.op, { isRemote: true });
  }

  private async detectLocalConflict(
    remoteOp: Operation,
  ): Promise<OperationLogEntry | null> {
    // Find pending local ops that touch the same entity
    const pendingOps = await this.opLogStore.getOpsWhere({
      syncStatus: 'pending',
      entityId: remoteOp.entityId,
    });

    for (const localEntry of pendingOps) {
      if (this.isConflicting(localEntry.op, remoteOp)) {
        return localEntry;
      }
    }

    return null;
  }

  private isConflicting(localOp: Operation, remoteOp: Operation): boolean {
    // Different entities = no conflict
    if (localOp.entityId !== remoteOp.entityId) return false;

    // Same client = no conflict
    if (localOp.clientId === remoteOp.clientId) return false;

    // Compare vector clocks for causality
    const comparison = compareVectorClocks(localOp.vectorClock, remoteOp.vectorClock);
    return comparison === VectorClockComparison.CONCURRENT;
  }
}
```

### 3. Real-Time WebSocket Connection

```typescript
class WebSocketSyncService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly BASE_RECONNECT_DELAY = 1000;
  private heartbeatInterval: number | null = null;
  private lastPong: number = 0;

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const token = await this.authService.getToken();
    const url = `${WS_SERVER_URL}/sync?token=${token}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.sendSubscribe();
    };

    this.ws.onmessage = (event) => this.handleMessage(event);

    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      if (!event.wasClean) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleMessage(event: MessageEvent): void {
    const message: ServerMessage = JSON.parse(event.data);

    switch (message.type) {
      case 'NEW_OPS':
        this.handleNewOps(message.payload);
        break;

      case 'CONFLICT':
        this.handleConflictNotification(message.payload);
        break;

      case 'ACK':
        this.handleAck(message.payload);
        break;

      case 'PONG':
        this.lastPong = Date.now();
        break;

      case 'ERROR':
        this.handleError(message.payload);
        break;

      case 'FORCE_REFRESH':
        // Server requests full re-sync (schema change, data corruption, etc.)
        this.triggerFullRefresh();
        break;
    }
  }

  private async handleNewOps(payload: { ops: ServerOperation[] }): Promise<void> {
    for (const serverOp of payload.ops) {
      // Skip our own ops (echoed back)
      if (serverOp.op.clientId === this.clientId) continue;

      const conflict = await this.downloadService.detectLocalConflict(serverOp.op);

      if (conflict) {
        await this.downloadService.resolveLocalConflict(conflict, serverOp);
      } else {
        await this.downloadService.applyRemoteOp(serverOp);
      }
    }
  }

  private sendSubscribe(): void {
    this.send({
      type: 'SUBSCRIBE',
      payload: {
        lastServerSeq: this.opLogStore.getLastServerSeq(),
        clientId: this.clientId,
      },
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      if (Date.now() - this.lastPong > 30000) {
        // No pong in 30s - connection dead
        this.ws?.close();
        return;
      }
      this.send({ type: 'PING' });
    }, 15000);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.notifyUser('Unable to connect to sync server');
      return;
    }

    const delay = this.BASE_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    setTimeout(() => this.connect(), Math.min(delay, 60000));
  }

  private send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}
```

---

## Conflict Detection

### When Conflicts Occur

```
Timeline showing concurrent modifications:

Client A                    Server                    Client B
   │                          │                          │
   │ [vc: {A:1}]              │                          │
   │ Edit task title          │                          │
   │ "Buy milk"               │                          │
   │────────────────────────► │                          │
   │                          │ [vc: {A:1}]              │
   │                          │ Accepted (seq: 100)      │
   │                          │                          │
   │                          │              [vc: {B:1}] │
   │                          │         Edit task title  │
   │                          │         "Buy groceries"  │
   │                          │ ◄────────────────────────│
   │                          │                          │
   │                          │ CONFLICT DETECTED        │
   │                          │ {A:1} vs {B:1}           │
   │                          │ = CONCURRENT (no causal) │
```

### Vector Clock vs. Server Sequence

**Primary Authority: Server Sequence**
In this centralized architecture, the **Server Sequence Number** is the absolute source of truth for ordering.

- If Op A has `serverSeq: 100` and Op B has `serverSeq: 101`, then A happened before B. Period.
- This simplifies the "sync protocol" to a linear fetch: "Give me everything > 100".

**Secondary Utility: Vector Clocks (Client-Side)**
Vector Clocks are maintained to help the _Client_ understand its own history relative to the server's, specifically for:

1.  **Offline Branching:** Determining if local pending ops are truly concurrent with incoming server ops (requiring a merge) or if they are just "ahead" (requiring a fast-forward).
2.  **Three-way Merges:** Providing the "Base" version context for complex merges.

```typescript
enum VectorClockComparison {
  BEFORE, // a happened-before b
  AFTER, // a happened-after b
  EQUAL, // Same logical time
  CONCURRENT, // Neither ordered → CONFLICT
}

function compareVectorClocks(a: VectorClock, b: VectorClock): VectorClockComparison {
  let aBeforeB = false;
  let bBeforeA = false;

  const allClients = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const clientId of allClients) {
    const aVal = a[clientId] ?? 0;
    const bVal = b[clientId] ?? 0;

    if (aVal < bVal) aBeforeB = true;
    if (bVal < aVal) bBeforeA = true;
  }

  if (aBeforeB && bBeforeA) return VectorClockComparison.CONCURRENT;
  if (aBeforeB) return VectorClockComparison.BEFORE;
  if (bBeforeA) return VectorClockComparison.AFTER;
  return VectorClockComparison.EQUAL;
}
```

### Alternative: Hybrid Logical Clocks (HLC)

For future consideration, HLC offers advantages over pure vector clocks:

```typescript
interface HybridLogicalClock {
  wallTime: number; // Physical clock component (ms since epoch)
  logical: number; // Logical counter for same wallTime
  nodeId: string; // For deterministic tiebreaking
}

// Fits in 64 bits - more compact than unbounded vector clocks
// Used by MongoDB, CockroachDB, YugabyteDB
```

**HLC Advantages:**

- Fixed size (64 bits) vs. unbounded vector clocks
- Human-readable timestamps
- Captures causality like logical clocks
- Close to NTP time for debugging

**HLC Best Practices:**

- Set reasonable error bounds (250-500ms default)
- Validate client timestamps (reject if > 20s from server)
- Sync nodes with NTP

**Current Choice:** We use server-assigned sequences as primary ordering with vector clocks for client-side conflict detection. HLC could replace vector clocks in future versions if clock synchronization proves reliable.

### Conflict Types

| Type               | Description                          | Detection                    |
| ------------------ | ------------------------------------ | ---------------------------- |
| **Update-Update**  | Same field modified by two clients   | Vector clocks concurrent     |
| **Update-Delete**  | One updates, one deletes same entity | Update targets deleted ID    |
| **Create-Create**  | Same ID created independently        | Impossible with UUID v7      |
| **Parent-Delete**  | Child modified, parent deleted       | Parent ID in tombstone table |
| **Order Conflict** | Both reorder same list differently   | MOV ops on same parent       |

---

## Conflict Resolution

### Resolution Strategy Matrix

| Entity Type  | Field          | Strategy        | Rationale                         |
| ------------ | -------------- | --------------- | --------------------------------- |
| Task         | title          | LWW             | Single value, user expects latest |
| Task         | notes          | LWW             | Text merge too complex            |
| Task         | tagIds         | Set union       | Tags are additive                 |
| Task         | timeSpentOnDay | Additive merge  | Time tracking sums naturally      |
| Task         | isDone         | LWW             | Boolean, latest state wins        |
| Task         | subTaskIds     | Order merge     | Preserve both orderings           |
| Project      | taskIds        | Order merge     | Preserve insertions from both     |
| Tag          | \*             | LWW             | Simple structure                  |
| GlobalConfig | \*             | Field-level LWW | Each setting independent          |

### Three-Way Merge Algorithm

```typescript
interface MergeContext<T> {
  base: T | null; // Common ancestor (may not exist)
  local: T;
  remote: T;
  localOp: Operation;
  remoteOp: Operation;
}

interface MergeResult<T> {
  merged: T;
  strategy: 'clean_merge' | 'auto_merge' | 'lww' | 'manual_required';
  conflicts: FieldConflict[];
}

async function mergeEntity<T extends SyncModel>(
  ctx: MergeContext<T>,
): Promise<MergeResult<T>> {
  const { base, local, remote, localOp, remoteOp } = ctx;
  const conflicts: FieldConflict[] = [];

  // If no base, fall back to LWW
  if (!base) {
    const winner = localOp.timestamp > remoteOp.timestamp ? local : remote;
    return {
      merged: winner,
      strategy: 'lww',
      conflicts: [{ field: '*', reason: 'no_base_version' }],
    };
  }

  const merged = { ...base } as T;
  const fields = Object.keys(local) as (keyof T)[];

  for (const field of fields) {
    const baseVal = base[field];
    const localVal = local[field];
    const remoteVal = remote[field];

    // No change
    if (isEqual(localVal, baseVal) && isEqual(remoteVal, baseVal)) {
      continue;
    }

    // Only local changed
    if (isEqual(remoteVal, baseVal)) {
      merged[field] = localVal;
      continue;
    }

    // Only remote changed
    if (isEqual(localVal, baseVal)) {
      merged[field] = remoteVal;
      continue;
    }

    // Both changed to same value
    if (isEqual(localVal, remoteVal)) {
      merged[field] = localVal;
      continue;
    }

    // Both changed differently → apply strategy
    const fieldStrategy = getFieldStrategy(ctx.localOp.entityType, field);
    const resolution = applyFieldStrategy(
      fieldStrategy,
      baseVal,
      localVal,
      remoteVal,
      localOp.timestamp,
      remoteOp.timestamp,
    );

    merged[field] = resolution.value;
    if (resolution.hadConflict) {
      conflicts.push({
        field: String(field),
        baseVal,
        localVal,
        remoteVal,
        resolution: resolution.strategy,
      });
    }
  }

  return {
    merged,
    strategy: conflicts.length > 0 ? 'auto_merge' : 'clean_merge',
    conflicts,
  };
}
```

### Specific Merge Strategies

```typescript
// Set union for arrays like tagIds
function mergeSetUnion<T>(base: T[], local: T[], remote: T[]): T[] {
  const baseSet = new Set(base);
  const localAdded = local.filter((x) => !baseSet.has(x));
  const remoteAdded = remote.filter((x) => !baseSet.has(x));
  const localRemoved = base.filter((x) => !local.includes(x));
  const remoteRemoved = base.filter((x) => !remote.includes(x));

  // Start with base, apply all changes
  let result = [...base];
  result = result.filter((x) => !localRemoved.includes(x));
  result = result.filter((x) => !remoteRemoved.includes(x));
  result = [...new Set([...result, ...localAdded, ...remoteAdded])];

  return result;
}

// Additive merge for time tracking
function mergeTimeSpent(
  base: Record<string, number>,
  local: Record<string, number>,
  remote: Record<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {};
  const allDays = new Set([
    ...Object.keys(base),
    ...Object.keys(local),
    ...Object.keys(remote),
  ]);

  for (const day of allDays) {
    const baseVal = base[day] ?? 0;
    const localVal = local[day] ?? 0;
    const remoteVal = remote[day] ?? 0;

    // Sum the deltas
    const localDelta = localVal - baseVal;
    const remoteDelta = remoteVal - baseVal;
    result[day] = baseVal + localDelta + remoteDelta;
  }

  return result;
}

// Order merge for lists (preserves insertions from both)
function mergeOrder(base: string[], local: string[], remote: string[]): string[] {
  // Use longest common subsequence to find stable anchors
  const lcs = findLCS(base, local, remote);

  // Interleave new items around anchors
  // This is a simplified version - production would use a proper list CRDT
  const result: string[] = [];
  const localNew = local.filter((x) => !base.includes(x));
  const remoteNew = remote.filter((x) => !base.includes(x));

  // Add items in order they appear, deduplicating
  const seen = new Set<string>();
  for (const id of [...local, ...remoteNew]) {
    if (!seen.has(id)) {
      result.push(id);
      seen.add(id);
    }
  }

  return result;
}
```

### User Conflict Resolution UI

```typescript
interface PendingConflict {
  id: string;
  entityType: EntityType;
  entityId: string;
  localOp: Operation;
  remoteOp: Operation;
  autoMergeResult?: unknown; // If auto-merge was attempted
  conflictingFields: string[];
  detectedAt: number;
  expiresAt: number; // Auto-resolve with LWW if not resolved
}

// Store in dedicated conflict queue
class ConflictQueueService {
  private conflicts: Map<string, PendingConflict> = new Map();

  async addConflict(conflict: PendingConflict): Promise<void> {
    this.conflicts.set(conflict.id, conflict);
    await this.persistConflicts();
    this.notifyUser(conflict);
  }

  async resolveConflict(
    conflictId: string,
    choice: 'local' | 'remote' | 'merged',
    mergedValue?: unknown,
  ): Promise<void> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return;

    let finalValue: unknown;
    switch (choice) {
      case 'local':
        finalValue = conflict.localOp.payload;
        break;
      case 'remote':
        finalValue = conflict.remoteOp.payload;
        break;
      case 'merged':
        finalValue = mergedValue;
        break;
    }

    // Create resolution operation
    const resolutionOp: Operation = {
      id: uuidv7(),
      clientId: this.clientId,
      opType: 'UPD',
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      payload: finalValue,
      vectorClock: this.vectorClock.increment(),
      timestamp: Date.now(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      // Mark as conflict resolution
      metadata: {
        isConflictResolution: true,
        resolvedConflictId: conflictId,
        originalOps: [conflict.localOp.id, conflict.remoteOp.id],
      },
    };

    await this.opLogStore.appendOperation(resolutionOp);
    this.conflicts.delete(conflictId);
    await this.persistConflicts();
  }
}
```

---

## Deletion Handling

### Tombstones

Deleted entities must be tracked to prevent resurrection from offline clients:

```typescript
interface Tombstone {
  entityType: EntityType;
  entityId: string;
  deletedAt: number;
  deletedByClientId: string;
  deletedByOpId: string;
  // Tombstone retention
  expiresAt: number; // Default: 90 days after deletion
}

// When processing a remote operation
async function applyRemoteOp(op: Operation): Promise<void> {
  if (op.opType === 'DEL') {
    // Create tombstone
    await this.tombstoneStore.create({
      entityType: op.entityType,
      entityId: op.entityId!,
      deletedAt: op.timestamp,
      deletedByClientId: op.clientId,
      deletedByOpId: op.id,
      expiresAt: Date.now() + TOMBSTONE_RETENTION_MS,
    });

    // Apply deletion to NgRx
    await this.operationApplier.apply(op, { isRemote: true });
    return;
  }

  // Check if entity was deleted
  const tombstone = await this.tombstoneStore.get(op.entityType, op.entityId!);
  if (tombstone) {
    if (op.timestamp < tombstone.deletedAt) {
      // Operation predates deletion - ignore
      console.log(`Ignoring op ${op.id} - entity was deleted`);
      return;
    } else {
      // Operation after deletion - this is an update-delete conflict
      await this.handleUpdateDeleteConflict(op, tombstone);
      return;
    }
  }

  // Normal apply
  await this.operationApplier.apply(op, { isRemote: true });
}
```

### Tombstone Cleanup

```typescript
async function cleanupTombstones(): Promise<void> {
  const expiredTombstones = await this.tombstoneStore.getExpired();

  for (const tombstone of expiredTombstones) {
    // Check all clients have seen the deletion
    const allClientsSynced = await this.serverApi.checkAllClientsSynced(
      tombstone.deletedByOpId,
    );

    if (allClientsSynced) {
      await this.tombstoneStore.delete(tombstone.entityId);

      // Create cleanup operation (for audit trail)
      const cleanupOp: Operation = {
        id: uuidv7(),
        opType: 'TOMBSTONE_CLEANUP',
        entityType: tombstone.entityType,
        entityId: tombstone.entityId,
        // ...
      };
      await this.opLogStore.appendOperation(cleanupOp);
    }
  }
}
```

---

## Sync-Aware Compaction

### Compaction Rules

```typescript
interface CompactionConfig {
  // Triggers
  maxOpsBeforeCompaction: number; // 1000
  maxAgeBeforeCompaction: number; // 24 hours

  // Retention
  minSyncedRetention: number; // 7 days - keep for debugging
  unsyncedRetention: 'forever'; // Never delete unsynced ops

  // Snapshot
  snapshotFrequency: number; // Every 500 ops
}

class CompactionService {
  async compact(): Promise<void> {
    const config = await this.getConfig();
    const isServerSync = await this.configService.isServerSyncEnabled();

    if (isServerSync) {
      await this.serverAwareCompaction(config);
    } else {
      await this.localOnlyCompaction(config);
    }
  }

  private async serverAwareCompaction(config: CompactionConfig): Promise<void> {
    // 1. Never delete unsynced operations
    const oldestUnsynced = await this.opLogStore.getOldestWhere({
      syncStatus: { $ne: 'synced' },
    });

    // 2. Calculate safe cutoff
    const syncedCutoff = Date.now() - config.minSyncedRetention;
    const seqCutoff = oldestUnsynced
      ? oldestUnsynced.seq - 1
      : await this.opLogStore.getLastSeq();

    // 3. Create snapshot from current NgRx state
    const currentState = await this.storeDelegateService.getAllSyncModelDataFromStore();

    await this.opLogStore.saveStateCache({
      state: currentState,
      lastAppliedOpSeq: seqCutoff,
      savedAt: Date.now(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      lastSyncedServerSeq: await this.opLogStore.getLastServerSeq(),
    });

    // 4. Delete only old, synced operations
    const deleted = await this.opLogStore.deleteOpsWhere({
      seq: { $lt: seqCutoff },
      syncStatus: 'synced',
      syncedAt: { $lt: syncedCutoff },
    });

    console.log(`Compaction complete: deleted ${deleted} ops`);
  }
}
```

---

## Server API Design

### REST Endpoints

```
Authentication: Bearer token in Authorization header

POST   /api/v1/sync/ops
       Upload operations (batch)
       Body: { ops: Operation[], clientId: string, lastKnownServerSeq: number }
       Response: {
         results: Array<{ opId, accepted, serverSeq?, conflict?, rejected? }>,
         newRemoteOps?: ServerOperation[],  // Piggyback new ops in response
         latestServerSeq: number
       }

GET    /api/v1/sync/ops
       Download operations
       Query: since={serverSeq}&limit={n}&excludeClient={clientId}
       Response: {
         ops: ServerOperation[],
         hasMore: boolean,
         latestServerSeq: number,
         latestVectorClock: VectorClock
       }

GET    /api/v1/sync/snapshot
       Get full state snapshot (new device setup)
       Response: {
         state: AllSyncModels,
         serverSeq: number,
         vectorClock: VectorClock,
         generatedAt: number
       }

POST   /api/v1/sync/snapshot
       Upload full state (extended offline recovery)
       Body: { state: AllSyncModels, clientId: string, reason: string }
       Response: { accepted: boolean, serverSeq: number }

GET    /api/v1/sync/conflicts
       Get pending conflicts for user
       Response: { conflicts: PendingConflict[] }

POST   /api/v1/sync/conflicts/{id}/resolve
       Submit conflict resolution
       Body: { choice: 'local' | 'remote' | 'merged', mergedValue?: unknown }
       Response: { resolved: boolean, resultingOp: Operation }

GET    /api/v1/sync/status
       Get sync status
       Response: {
         lastSyncedAt: number,
         pendingUploads: number,
         pendingDownloads: number,
         conflicts: number,
         clientsOnline: string[]
       }

DELETE /api/v1/sync/data
       Delete all user data (GDPR)
       Response: { deleted: boolean, deletedAt: number }
```

### WebSocket Protocol

```typescript
// Connection: wss://api.example.com/sync/ws?token={jwt}

// Client → Server messages
type ClientMessage =
  | { type: 'SUBSCRIBE'; payload: { lastServerSeq: number; clientId: string } }
  | { type: 'UPLOAD_OPS'; payload: { ops: Operation[] } }
  | { type: 'PING' }
  | { type: 'ACK'; payload: { serverSeqs: number[] } };

// Server → Client messages
type ServerMessage =
  | { type: 'NEW_OPS'; payload: { ops: ServerOperation[] } }
  | { type: 'CONFLICT'; payload: PendingConflict }
  | { type: 'ACK'; payload: { opIds: string[]; serverSeqs: number[] } }
  | { type: 'PONG' }
  | { type: 'ERROR'; payload: { code: string; message: string } }
  | { type: 'FORCE_REFRESH'; payload: { reason: string } };
```

### Error Codes

| Code              | HTTP | Description                  |
| ----------------- | ---- | ---------------------------- |
| `INVALID_OP`      | 400  | Malformed operation          |
| `SCHEMA_MISMATCH` | 400  | Client schema too old        |
| `CONFLICT`        | 409  | Conflict detected (see body) |
| `UNAUTHORIZED`    | 401  | Invalid/expired token        |
| `RATE_LIMITED`    | 429  | Too many requests            |
| `SERVER_ERROR`    | 500  | Internal error               |
| `MAINTENANCE`     | 503  | Server maintenance           |

---

## Offline Handling

### Connection State Machine

```
                    ┌─────────────┐
                    │   ONLINE    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │ SYNCING │  │  IDLE   │  │ OFFLINE │
        └────┬────┘  └────┬────┘  └────┬────┘
             │            │            │
             └────────────┼────────────┘
                          │
                    ┌─────▼─────┐
                    │ RECONNECT │
                    │ (backoff) │
                    └───────────┘
```

```typescript
enum ConnectionState {
  ONLINE_IDLE = 'online_idle',
  ONLINE_SYNCING = 'online_syncing',
  OFFLINE = 'offline',
  RECONNECTING = 'reconnecting',
}

class ConnectionManager {
  private state = signal<ConnectionState>(ConnectionState.OFFLINE);
  private pendingOpsCount = signal<number>(0);

  constructor() {
    // Browser online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Initial state
    if (navigator.onLine) {
      this.connect();
    }
  }

  private handleOnline(): void {
    this.state.set(ConnectionState.RECONNECTING);
    this.connect();
  }

  private handleOffline(): void {
    this.state.set(ConnectionState.OFFLINE);
    this.websocketService.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      await this.websocketService.connect();
      this.state.set(ConnectionState.ONLINE_SYNCING);

      // Sync pending ops
      await this.uploadService.uploadPendingOps();
      await this.downloadService.downloadRemoteOps();

      this.state.set(ConnectionState.ONLINE_IDLE);
    } catch (error) {
      this.scheduleReconnect();
    }
  }
}
```

### Extended Offline Recovery

```typescript
async function handleExtendedOffline(): Promise<void> {
  const pendingCount = await this.opLogStore.countWhere({
    syncStatus: 'pending',
  });
  const oldestPending = await this.opLogStore.getOldestWhere({
    syncStatus: 'pending',
  });

  const offlineDuration = oldestPending ? Date.now() - oldestPending.appliedAt : 0;

  // Thresholds
  const WARN_OPS = 500;
  const CRITICAL_OPS = 2000;
  const WARN_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

  if (pendingCount > CRITICAL_OPS || offlineDuration > WARN_DURATION) {
    // Show recovery dialog
    const choice = await this.showRecoveryDialog({
      pendingCount,
      offlineDuration,
      options: [
        {
          id: 'upload_ops',
          label: 'Upload all changes',
          description: `Upload ${pendingCount} pending changes`,
        },
        {
          id: 'upload_snapshot',
          label: 'Upload current state',
          description: 'Faster, but loses operation history',
        },
        {
          id: 'download_remote',
          label: 'Discard local, use remote',
          description: 'Warning: loses local changes',
        },
      ],
    });

    switch (choice) {
      case 'upload_ops':
        await this.uploadPendingOpsWithProgress();
        break;
      case 'upload_snapshot':
        await this.uploadStateSnapshot();
        break;
      case 'download_remote':
        await this.forceDownloadRemote();
        break;
    }
  } else if (pendingCount > WARN_OPS) {
    // Show warning but proceed normally
    this.showWarning(`Syncing ${pendingCount} offline changes. This may take a moment.`);
    await this.uploadPendingOps();
  } else {
    // Normal sync
    await this.uploadPendingOps();
  }
}
```

---

## New Device Setup

```typescript
async function setupNewDevice(): Promise<void> {
  // 1. Authenticate user
  const token = await this.authService.authenticate();

  // 2. Check for existing data
  const hasRemoteData = await this.serverApi.hasData();

  if (hasRemoteData) {
    // Download full snapshot
    const snapshot = await this.serverApi.getSnapshot();

    // Initialize local state
    await this.opLogStore.saveStateCache({
      state: snapshot.state,
      lastAppliedOpSeq: 0,
      savedAt: Date.now(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    });

    // Set sync cursor
    await this.opLogStore.setLastServerSeq(snapshot.serverSeq);

    // Load into NgRx
    this.store.dispatch(
      loadAllData({
        appDataComplete: snapshot.state,
        meta: { isHydration: true },
      }),
    );

    // Start real-time sync
    await this.websocketService.connect();
  } else {
    // Fresh account - start with empty state
    await this.initializeEmptyState();
  }
}
```

---

## Security Considerations

### Authentication & Authorization

```typescript
// All API calls require valid JWT
interface SyncToken {
  userId: string;
  clientId: string;
  scopes: ['sync:read', 'sync:write'];
  exp: number;
}

// Server validates on every request
function validateRequest(req: Request): void {
  const token = extractToken(req);
  const decoded = verifyJWT(token);

  // Verify clientId matches
  if (req.body.clientId !== decoded.clientId) {
    throw new UnauthorizedError('Client ID mismatch');
  }

  // Verify operations belong to user
  for (const op of req.body.ops) {
    if (op.userId && op.userId !== decoded.userId) {
      throw new UnauthorizedError('Operation user mismatch');
    }
  }
}
```

### Rate Limiting

```typescript
const RATE_LIMITS = {
  uploadOps: { requests: 100, window: 60 }, // 100 req/min
  downloadOps: { requests: 200, window: 60 }, // 200 req/min
  websocket: { messages: 1000, window: 60 }, // 1000 msg/min
};
```

### Data Validation

```typescript
// Server validates all operations
function validateOperation(op: Operation): ValidationResult {
  // Schema validation
  const schemaValid = validateSchema(op, OperationSchema);
  if (!schemaValid) return { valid: false, error: 'Invalid schema' };

  // Size limits
  const payloadSize = JSON.stringify(op.payload).length;
  if (payloadSize > MAX_PAYLOAD_SIZE) {
    return { valid: false, error: 'Payload too large' };
  }

  // Entity type validation
  if (!VALID_ENTITY_TYPES.includes(op.entityType)) {
    return { valid: false, error: 'Invalid entity type' };
  }

  // Timestamp sanity check (not too far in future/past)
  const now = Date.now();
  if (op.timestamp > now + MAX_CLOCK_DRIFT) {
    return { valid: false, error: 'Timestamp in future' };
  }
  if (op.timestamp < now - MAX_OP_AGE) {
    return { valid: false, error: 'Operation too old' };
  }

  return { valid: true };
}
```

---

## Server Infrastructure

### Database Strategy

The architecture uses **SQLite** (`better-sqlite3`) as the primary database. This ensures the server remains lightweight, zero-configuration, and easy to self-host, while still capable of handling thousands of daily operations for typical user/team sizes.

### Database Schema

```sql
-- Operations table (append-only)
CREATE TABLE operations (
  server_seq INTEGER PRIMARY KEY,       -- Global Monotonic Sequence
  user_id INTEGER NOT NULL,
  client_id TEXT NOT NULL,
  op_id TEXT NOT NULL UNIQUE,
  op_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  payload TEXT NOT NULL,                -- JSON string
  vector_clock TEXT NOT NULL,           -- JSON string
  timestamp INTEGER NOT NULL,
  schema_version INTEGER NOT NULL,
  received_at INTEGER,                  -- Timestamp (DEFAULT (unixepoch() * 1000))
  status TEXT DEFAULT 'accepted'
);

-- Entity state cache (for fast snapshot generation)
CREATE TABLE entity_states (
  user_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  current_state JSONB NOT NULL,
  last_op_seq BIGINT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (user_id, entity_type, entity_id)
);

-- Tombstones for deleted entities
CREATE TABLE tombstones (
  user_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_by_op_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  PRIMARY KEY (user_id, entity_type, entity_id)
);

-- Pending conflicts
CREATE TABLE conflicts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  local_op_id UUID NOT NULL,
  remote_op_id UUID NOT NULL,
  conflicting_fields TEXT[],
  auto_merge_result JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution JSONB,

  INDEX idx_conflicts_user (user_id, status)
);

-- Client tracking (for vector clock pruning)
CREATE TABLE clients (
  user_id UUID NOT NULL,
  client_id VARCHAR(64) NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device_name VARCHAR(255),

  PRIMARY KEY (user_id, client_id)
);
```

### Scaling Considerations

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │  API Server │   │  API Server │   │  API Server │
    │  (stateless)│   │  (stateless)│   │  (stateless)│
    └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Redis Pub/Sub │ ← WebSocket coordination
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    │   (primary)     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Read Replicas │
                    └─────────────────┘
```

- **Horizontal scaling**: API servers are stateless
- **WebSocket coordination**: Redis pub/sub for cross-server message delivery
- **Database**: PostgreSQL with read replicas for downloads
- **Partitioning**: Shard by user_id if needed at scale

---

## Implementation Phases

### Phase 1: Foundation (4-6 weeks)

- [ ] Server API implementation (REST only)
- [ ] Basic auth integration
- [ ] `syncedAt` tracking in client SUP_OPS
- [ ] Upload flow with retry logic
- [ ] Download flow with cursor tracking
- [ ] Connection state management
- [ ] Basic error handling

**Milestone**: Manual sync working via REST

### Phase 2: Real-Time (2-3 weeks)

- [ ] WebSocket server implementation
- [ ] Client WebSocket service
- [ ] Heartbeat and reconnection
- [ ] Real-time op delivery
- [ ] Presence tracking (optional)

**Milestone**: Changes appear on other devices within seconds

### Phase 3: Conflict Handling (3-4 weeks)

- [ ] Vector clock comparison on server
- [ ] Conflict detection during upload
- [ ] Auto-merge strategies per entity type
- [ ] Conflict queue storage
- [ ] Conflict resolution UI
- [ ] Manual resolution flow

**Milestone**: Concurrent edits handled gracefully

### Phase 4: Robustness (2-3 weeks)

- [ ] Tombstone management
- [ ] Sync-aware compaction
- [ ] Extended offline recovery
- [ ] New device setup flow
- [ ] Rate limiting
- [ ] Monitoring and alerting

**Milestone**: Production-ready sync

### Phase 5: Migration & Launch (2 weeks)

- [ ] Migration path from legacy sync
- [ ] Feature flag rollout
- [ ] Documentation
- [ ] Load testing
- [ ] Gradual rollout

**Milestone**: Server sync available to users

---

## Migration from Legacy Sync

### Transition Strategy

```
Phase 1: Parallel Operation
├── Legacy sync continues working
├── Server sync enabled via feature flag
└── Both write to same NgRx state

Phase 2: Data Migration
├── On enable: upload current state as snapshot
├── Mark all existing ops as synced
└── Begin op-based sync

Phase 3: Cutover
├── Disable legacy sync for migrated users
├── Remove legacy sync code (later release)
└── Full server sync
```

### Migration Flow

```typescript
async function migrateToServerSync(): Promise<void> {
  // 1. Pre-migration checks
  if (await this.hasPendingLegacySync()) {
    await this.completeLegacySync();
  }

  // 2. Upload initial snapshot
  const currentState = await this.storeDelegateService.getAllSyncModelDataFromStore();
  const result = await this.serverApi.uploadInitialSnapshot({
    state: currentState,
    clientId: this.clientId,
    migratedFrom: 'legacy',
  });

  // 3. Initialize sync state
  await this.opLogStore.setLastServerSeq(result.serverSeq);
  await this.opLogStore.markAllOpsAsSynced();

  // 4. Enable server sync
  await this.configService.set('syncProvider', 'server');
  await this.configService.set('legacySyncEnabled', false);

  // 5. Connect WebSocket
  await this.websocketService.connect();

  // 6. Verify sync working
  const testOp = await this.createTestOperation();
  const uploaded = await this.uploadService.uploadSingleOp(testOp);
  if (!uploaded) {
    throw new Error('Migration verification failed');
  }

  console.log('Migration to server sync complete');
}
```

---

## Monitoring & Observability

### Key Metrics

| Metric                  | Description            | Alert Threshold  |
| ----------------------- | ---------------------- | ---------------- |
| `sync.upload.latency`   | Time to upload batch   | p99 > 5s         |
| `sync.download.latency` | Time to download ops   | p99 > 5s         |
| `sync.pending_ops`      | Ops waiting to sync    | > 1000 per user  |
| `sync.conflicts.rate`   | Conflicts per hour     | > 10 per user    |
| `sync.ws.connections`   | Active WebSocket conns | Capacity warning |
| `sync.ws.reconnects`    | Reconnection rate      | > 5/min per user |
| `sync.errors.rate`      | Error rate             | > 1%             |

### Client-Side Logging

```typescript
class SyncTelemetry {
  logSyncCycle(result: SyncResult): void {
    this.log('sync_cycle', {
      uploaded: result.uploaded,
      downloaded: result.downloaded,
      conflicts: result.conflicts,
      duration: result.durationMs,
      pendingAfter: result.pendingOps,
    });
  }

  logConflict(conflict: PendingConflict): void {
    this.log('sync_conflict', {
      entityType: conflict.entityType,
      fields: conflict.conflictingFields,
      autoResolved: !!conflict.autoMergeResult,
    });
  }

  logError(error: SyncError): void {
    this.log('sync_error', {
      code: error.code,
      message: error.message,
      retryCount: error.retryCount,
    });
  }
}
```

---

## Industry Patterns & Influences

This architecture draws from proven patterns in production sync systems:

### Replicache Pattern (Push/Pull Protocol)

Our push/pull protocol is inspired by Replicache's approach:

- **Server is authoritative** - Client mutations are speculative until confirmed
- **Rebase strategy** - On pull, rewind to last confirmed state, apply patch, replay pending mutations
- **Poke pattern** - WebSocket sends lightweight hints ("NEW_OPS"), client pulls full state via REST

```typescript
// Poke pattern - server broadcasts hint, not data
wsManager.broadcastToUser(userId, excludeClientId, {
  type: 'POKE', // or 'NEW_OPS' with just latestSeq
  latestSeq, // Client decides when to pull
});
```

**Why pokes?** Reduces server complexity (no need to track what each client has seen), works with CDN caching, and client always gets consistent view.

### Linear Sync Engine Pattern

Linear's approach influenced our transaction model:

- **Transactions execute on server** - Server may perform side effects (history, constraints)
- **Delta packets may differ from input** - Server response is authoritative
- **Sync ID per action** - Our `serverSeq` serves the same purpose
- **IndexedDB caching** - Offline queue with automatic retry on reconnect

### Figma LiveGraph Pattern

For future scaling, consider Figma's approach:

- **Database WAL subscription** - Instead of polling, subscribe to PostgreSQL replication stream
- **Query decomposition** - Break complex views into cacheable subqueries
- **Invalidation routing** - Use probabilistic filters for efficient cache invalidation

### Operation-Based CRDT Principles

Our operation log follows CRDT principles from Bartosz Sypytkowski's research:

- **Reliable Causal Broadcast (RCB)** - All updates eventually reach all nodes
- **Commutativity** - Operations can apply in any order (within causality constraints)
- **Idempotency** - Same operation applied twice = same result (UUID v7 as natural idempotency key)

---

## References

- [Operation Log Sync Research](./operation-log-sync-research.md) - Industry best practices
- [Operation Log Architecture](./operation-log-architecture.md) - Full system design
- [Execution Plan](./operation-log-execution-plan.md) - Implementation tasks
- [PFAPI Architecture](./pfapi-sync-persistence-architecture.md) - Legacy sync system

### External References

- [Replicache - How It Works](https://doc.replicache.dev/concepts/how-it-works)
- [Linear Sync Engine (Reverse Engineered)](https://github.com/wzhudev/reverse-linear-sync-engine)
- [Figma LiveGraph](https://www.figma.com/blog/livegraph-real-time-data-fetching-at-figma/)
- [Operation-Based CRDTs Protocol](https://www.bartoszsypytkowski.com/operation-based-crdts-protocol/)
- [Hybrid Logical Clocks](https://cse.buffalo.edu/tech-reports/2014-04.pdf)

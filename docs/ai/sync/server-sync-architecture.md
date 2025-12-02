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

### Non-Goals (for initial implementation)

- Real-time collaboration (multiple users, same account)
- Selective sync (partial data sets)
- End-to-end encryption (use existing solution)

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
│                                          │ SyncService                  │    │
│                                          │ ├─ uploadPendingOps()        │    │
│                                          │ └─ downloadRemoteOps()       │    │
│                                          └──────────────┬───────────────┘    │
└─────────────────────────────────────────────────────────┼────────────────────┘
                                                          │
                                               ┌──────────▼──────────┐
                                               │   Server API        │
                                               │   ├─ POST /ops      │
                                               │   ├─ GET /ops       │
                                               │   └─ WS /subscribe  │
                                               └──────────┬──────────┘
                                                          │
┌─────────────────────────────────────────────────────────┼────────────────────┐
│                              Client B                    │                    │
│                                          ┌───────────────▼──────────────┐    │
│                                          │ SyncService                  │    │
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

## Data Model Extensions

### Extended Operation Structure

```typescript
interface Operation {
  // Existing fields (Part A)
  id: string; // UUID v7 (time-ordered)
  actionType: string; // NgRx action type
  opType: OpType; // CRT | UPD | DEL | MOV | BATCH | SYNC_IMPORT
  entityType: EntityType; // TASK | PROJECT | TAG | etc.
  entityId?: string;
  entityIds?: string[];
  payload: unknown;
  clientId: string;
  timestamp: number;
  schemaVersion: number;

  // Part C additions
  vectorClock: VectorClock; // Per-op causality (promoted from optional)
  serverSeq?: number; // Server-assigned sequence number
  parentOps?: string[]; // IDs of operations this depends on
}

interface OperationLogEntry {
  seq: number; // Local auto-increment
  op: Operation;
  appliedAt: number;
  source: 'local' | 'remote';

  // Part C additions
  syncedAt?: number; // When uploaded to server (null = pending)
  serverAck?: boolean; // Server acknowledged receipt
}
```

### Server-Side Storage

```typescript
// Server maintains global operation log
interface ServerOperation {
  serverSeq: number; // Global sequence number
  op: Operation;
  receivedAt: number;
  clientId: string;

  // Conflict metadata
  conflictsWith?: string[]; // IDs of conflicting ops
  resolution?: ConflictResolution;
}

interface ConflictResolution {
  strategy: 'client_wins' | 'server_wins' | 'merge' | 'manual';
  resolvedBy?: string; // Client ID or 'server'
  resolvedAt: number;
  mergedPayload?: unknown; // For merge strategy
}
```

---

## Sync Protocol

### 1. Upload Flow

```typescript
async uploadPendingOps(): Promise<void> {
  // 1. Get unsynced operations
  const pendingOps = await this.opLogStore.getOpsWhere({ syncedAt: null });

  if (pendingOps.length === 0) return;

  // 2. Upload in batches (preserve order)
  const BATCH_SIZE = 50;
  for (let i = 0; i < pendingOps.length; i += BATCH_SIZE) {
    const batch = pendingOps.slice(i, i + BATCH_SIZE);

    // 3. Send to server
    const response = await this.serverApi.uploadOps(batch.map(e => e.op));

    // 4. Handle response
    for (const result of response.results) {
      if (result.accepted) {
        // Mark as synced locally
        await this.opLogStore.updateEntry(result.opId, {
          syncedAt: Date.now(),
          serverAck: true,
          op: { ...batch.find(e => e.op.id === result.opId)!.op, serverSeq: result.serverSeq }
        });
      } else if (result.conflict) {
        // Handle conflict (see Conflict Resolution section)
        await this.handleConflict(result.opId, result.conflictingOps);
      }
    }
  }
}
```

### 2. Download Flow

```typescript
async downloadRemoteOps(): Promise<void> {
  // 1. Get last known server sequence
  const lastServerSeq = await this.opLogStore.getLastServerSeq();

  // 2. Fetch new operations from server
  const remoteOps = await this.serverApi.getOps({
    sinceSeq: lastServerSeq,
    excludeClientId: this.clientId  // Don't download our own ops
  });

  if (remoteOps.length === 0) return;

  // 3. Apply each operation
  for (const serverOp of remoteOps) {
    // Check for conflicts with local pending ops
    const conflict = await this.detectLocalConflict(serverOp.op);

    if (conflict) {
      await this.resolveConflict(conflict, serverOp.op);
    } else {
      // Apply directly
      await this.applyRemoteOp(serverOp.op);
    }
  }
}

private async applyRemoteOp(op: Operation): Promise<void> {
  // 1. Store in SUP_OPS with source='remote'
  await this.opLogStore.appendOperation({
    op,
    source: 'remote',
    syncedAt: Date.now(),  // Already synced (came from server)
  });

  // 2. Apply to NgRx (isRemote=true prevents re-logging)
  await this.operationApplier.apply(op, { isRemote: true });
}
```

### 3. Real-Time Subscription

```typescript
// WebSocket connection for instant updates
class ServerSyncService {
  private ws: WebSocket;

  connect(): void {
    this.ws = new WebSocket(`${SERVER_URL}/subscribe`);

    this.ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'NEW_OPS':
          // Server pushed new operations
          for (const op of message.ops) {
            if (op.clientId !== this.clientId) {
              await this.applyRemoteOp(op);
            }
          }
          break;

        case 'CONFLICT':
          // Server detected conflict requiring resolution
          await this.handleServerConflict(message.conflict);
          break;

        case 'ACK':
          // Server acknowledged our upload
          await this.markSynced(message.opIds);
          break;
      }
    };

    this.ws.onclose = () => {
      // Reconnect with exponential backoff
      this.scheduleReconnect();
    };
  }
}
```

---

## Conflict Detection

### When Conflicts Occur

Conflicts happen when two clients modify the same entity without seeing each other's changes:

```
Client A                    Server                    Client B
   │                          │                          │
   │  Update Task X (v1→v2)   │                          │
   │─────────────────────────►│                          │
   │                          │                          │
   │                          │   Update Task X (v1→v3)  │
   │                          │◄─────────────────────────│
   │                          │                          │
   │                          │ CONFLICT: Both based on v1
```

### Detection Algorithm

```typescript
function detectConflict(localOp: Operation, remoteOp: Operation): boolean {
  // Different entities = no conflict
  if (localOp.entityId !== remoteOp.entityId) return false;

  // Same client = no conflict (ordering handled by sequence)
  if (localOp.clientId === remoteOp.clientId) return false;

  // Compare vector clocks
  const comparison = compareVectorClocks(localOp.vectorClock, remoteOp.vectorClock);

  // CONCURRENT means neither happened-before the other
  return comparison === VectorClockComparison.CONCURRENT;
}

enum VectorClockComparison {
  BEFORE, // localOp happened before remoteOp
  AFTER, // localOp happened after remoteOp
  EQUAL, // Same operation
  CONCURRENT, // Neither ordered - CONFLICT
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

---

## Conflict Resolution

### Resolution Strategies

| Entity Type      | Strategy          | Rationale                                  |
| ---------------- | ----------------- | ------------------------------------------ |
| Task (content)   | Field-level merge | Different fields = merge, same field = LWW |
| Task (status)    | Last-write-wins   | Status is atomic                           |
| Task (timeSpent) | Additive merge    | Sum both deltas                            |
| Project          | Field-level merge | Rarely conflicts                           |
| Tag              | Last-write-wins   | Simple structure                           |
| GlobalConfig     | Field-level merge | Different settings = merge                 |

### Field-Level Merge

```typescript
interface MergeResult<T> {
  merged: T;
  conflicts: FieldConflict[];  // Fields that couldn't be auto-merged
}

function mergeTask(base: Task, local: Task, remote: Task): MergeResult<Task> {
  const conflicts: FieldConflict[] = [];
  const merged = { ...base };

  const fields: (keyof Task)[] = ['title', 'notes', 'tagIds', 'dueDate', ...];

  for (const field of fields) {
    const baseVal = base[field];
    const localVal = local[field];
    const remoteVal = remote[field];

    if (isEqual(localVal, remoteVal)) {
      // Same change = no conflict
      merged[field] = localVal;
    } else if (isEqual(baseVal, localVal)) {
      // Only remote changed
      merged[field] = remoteVal;
    } else if (isEqual(baseVal, remoteVal)) {
      // Only local changed
      merged[field] = localVal;
    } else {
      // Both changed differently = conflict
      if (MERGEABLE_FIELDS.includes(field)) {
        merged[field] = mergeField(field, localVal, remoteVal);
      } else {
        // Can't auto-merge - use LWW for now, flag for user review
        merged[field] = local.timestamp > remote.timestamp ? localVal : remoteVal;
        conflicts.push({ field, localVal, remoteVal, resolution: 'lww' });
      }
    }
  }

  return { merged, conflicts };
}
```

### Additive Merge (Time Tracking)

```typescript
// Special handling for time-tracking fields
function mergeTimeSpent(base: number, local: number, remote: number): number {
  // Both added time independently - sum the deltas
  const localDelta = local - base;
  const remoteDelta = remote - base;
  return base + localDelta + remoteDelta;
}
```

### User Conflict Resolution UI

For conflicts that can't be auto-resolved:

```typescript
interface PendingConflict {
  id: string;
  entityType: EntityType;
  entityId: string;
  localVersion: unknown;
  remoteVersion: unknown;
  baseVersion?: unknown;
  detectedAt: number;
}

// Store pending conflicts for user resolution
// Show in UI with side-by-side comparison
// User picks local, remote, or manual merge
```

---

## Sync-Aware Compaction

### The Problem

With server sync, we can't delete operations until we're sure:

1. They've been uploaded to the server
2. The server has acknowledged them
3. Enough time has passed for other clients to receive them

### Compaction Rules

```typescript
async compact(): Promise<void> {
  const isServerSyncEnabled = await this.configService.isServerSyncEnabled();

  if (isServerSyncEnabled) {
    // Conservative compaction - preserve unsynced ops
    await this.serverAwareCompaction();
  } else {
    // Aggressive compaction - local-only mode
    await this.localOnlyCompaction();
  }
}

private async serverAwareCompaction(): Promise<void> {
  // 1. Find oldest unsynced operation
  const oldestUnsynced = await this.opLogStore.getOldestUnsyncedOp();

  // 2. Get cutoff point (older than retention window AND synced)
  const cutoffSeq = oldestUnsynced
    ? oldestUnsynced.seq - 1  // Keep all from oldest unsynced
    : await this.opLogStore.getLastSeq() - RETENTION_BUFFER;

  // 3. Create snapshot from NgRx
  const currentState = await this.storeDelegateService.getAllSyncModelDataFromStore();

  // 4. Save snapshot
  await this.opLogStore.saveStateCache({
    state: currentState,
    lastAppliedOpSeq: cutoffSeq,
    savedAt: Date.now(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    lastSyncedServerSeq: await this.opLogStore.getLastServerSeq()
  });

  // 5. Delete only synced ops before cutoff
  await this.opLogStore.deleteOpsWhere({
    seq: { $lt: cutoffSeq },
    syncedAt: { $ne: null }  // Must be synced
  });
}
```

### Retention Configuration

| Setting                   | Value   | Description                   |
| ------------------------- | ------- | ----------------------------- |
| Min retention (synced)    | 7 days  | Keep synced ops for debugging |
| Min retention (unsynced)  | Forever | Never delete unsynced ops     |
| Max ops before compaction | 1000    | Trigger threshold             |
| Snapshot frequency        | 500 ops | Periodic snapshots            |

---

## Server API Design

### REST Endpoints

```
POST   /api/v1/sync/ops
  - Upload batch of operations
  - Returns: accepted ops, conflicts, server sequences

GET    /api/v1/sync/ops?since={serverSeq}&limit={n}
  - Download operations since sequence
  - Returns: array of operations with server metadata

GET    /api/v1/sync/snapshot
  - Download full state snapshot (for new device)
  - Returns: compressed state + last server sequence

POST   /api/v1/sync/conflicts/{conflictId}/resolve
  - Submit conflict resolution
  - Body: resolution strategy + merged payload if applicable

GET    /api/v1/sync/status
  - Get sync status (pending ops, last sync, conflicts)
```

### WebSocket Events

```typescript
// Client → Server
interface ClientMessage {
  type: 'SUBSCRIBE' | 'UPLOAD_OPS' | 'ACK';
  payload: unknown;
}

// Server → Client
interface ServerMessage {
  type: 'NEW_OPS' | 'CONFLICT' | 'ACK' | 'ERROR';
  payload: unknown;
}
```

### Request/Response Examples

```typescript
// Upload operations
POST /api/v1/sync/ops
{
  "ops": [
    {
      "id": "01234567-89ab-7def-0123-456789abcdef",
      "opType": "UPD",
      "entityType": "TASK",
      "entityId": "task-123",
      "payload": { "title": "Updated title" },
      "vectorClock": { "client-a": 5 },
      "timestamp": 1701500000000
    }
  ]
}

Response 200:
{
  "results": [
    {
      "opId": "01234567-89ab-7def-0123-456789abcdef",
      "accepted": true,
      "serverSeq": 12345
    }
  ]
}

Response 200 (with conflict):
{
  "results": [
    {
      "opId": "01234567-89ab-7def-0123-456789abcdef",
      "accepted": false,
      "conflict": {
        "conflictId": "conflict-456",
        "conflictingOps": ["..."],
        "suggestedResolution": "merge"
      }
    }
  ]
}
```

---

## Offline Handling

### Offline Queue

```typescript
class OfflineQueueService {
  private isOnline = navigator.onLine;

  constructor() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  private handleOnline(): void {
    this.isOnline = true;
    // Trigger sync of pending operations
    this.syncService.uploadPendingOps();
  }

  private handleOffline(): void {
    this.isOnline = false;
    // Operations continue to be logged locally
    // No change to write path
  }

  async queueOperation(op: Operation): Promise<void> {
    // Always write locally first
    await this.opLogStore.appendOperation(op);

    if (this.isOnline) {
      // Attempt immediate upload
      this.syncService.uploadSingleOp(op).catch(() => {
        // Failed - will retry on next sync cycle
      });
    }
  }
}
```

### Sync Recovery After Extended Offline

```typescript
async recoverFromExtendedOffline(): Promise<void> {
  const pendingCount = await this.opLogStore.getPendingCount();

  if (pendingCount > 1000) {
    // Too many pending ops - consider snapshot upload
    const shouldSnapshot = await this.promptUser(
      'You have many offline changes. Upload as snapshot?'
    );

    if (shouldSnapshot) {
      await this.uploadStateSnapshot();
    } else {
      // Upload ops in batches with progress indicator
      await this.uploadPendingOpsWithProgress();
    }
  } else {
    await this.uploadPendingOps();
  }
}
```

---

## Security Considerations

### Authentication

- All API calls require valid auth token
- WebSocket connections authenticated on connect
- Token refresh handled transparently

### Authorization

- Operations validated against user's account
- Server verifies clientId matches authenticated user
- Rate limiting on upload endpoints

### Data Integrity

- Operations signed with client key (optional)
- Server validates operation structure
- Checksums for large payloads

---

## Implementation Phases

### Phase 1: Foundation

- [ ] Server API design and implementation
- [ ] `syncedAt` tracking in SUP_OPS
- [ ] Basic upload/download without conflict handling
- [ ] Connection state management

### Phase 2: Conflict Handling

- [ ] Vector clock comparison
- [ ] Entity-level conflict detection
- [ ] Auto-merge for simple cases
- [ ] Conflict queue for manual resolution

### Phase 3: Real-Time

- [ ] WebSocket subscription
- [ ] Push notifications for new ops
- [ ] Presence indicators (optional)

### Phase 4: Optimization

- [ ] Sync-aware compaction
- [ ] Batch upload optimization
- [ ] Delta compression
- [ ] Offline recovery flows

---

## Migration from Legacy Sync

### Transition Strategy

1. **Parallel operation** - Run both legacy and server sync initially
2. **Feature flag** - Enable server sync per user
3. **Data migration** - Upload initial state to server
4. **Cutover** - Disable legacy sync, server-only

### Migration Steps

```typescript
async migrateToServerSync(): Promise<void> {
  // 1. Ensure local state is fully synced via legacy
  await this.legacySyncService.forceSync();

  // 2. Upload initial snapshot to server
  const currentState = await this.storeDelegateService.getAllSyncModelDataFromStore();
  await this.serverApi.uploadInitialSnapshot(currentState);

  // 3. Mark all existing ops as synced (they're in the snapshot)
  await this.opLogStore.markAllSynced();

  // 4. Enable server sync
  await this.configService.enableServerSync();

  // 5. Disable legacy sync
  await this.configService.disableLegacySync();
}
```

---

## References

- [Operation Log Architecture](./operation-log-architecture.md) - Full system design
- [Execution Plan](./operation-log-execution-plan.md) - Implementation tasks
- [PFAPI Architecture](./pfapi-sync-persistence-architecture.md) - Legacy sync system

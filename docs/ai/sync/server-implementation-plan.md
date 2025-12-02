# Server Sync Implementation Plan (Part C)

**Target Package:** `@super-productivity/super-sync-server`
**Status:** Draft
**Prerequisites:** Parts A & B (Client-side) complete
**Last Updated:** December 2, 2025

---

## Overview

This document provides a practical implementation plan for adding operation-log sync to the existing `super-sync-server` Fastify application. It focuses on what to build, in what order, and how to integrate with the existing codebase.

For architectural decisions and detailed algorithms, see [Server Sync Architecture](./server-sync-architecture.md).

---

## 1. Database Schema

The implementation will use **SQLite** (`better-sqlite3`) to extend the existing database, prioritizing simplicity and low maintenance for self-hosting.

### Tables

```sql
-- Stores the global operation log (append-only)
CREATE TABLE IF NOT EXISTS operations (
  id TEXT PRIMARY KEY,                  -- UUID v7 (client-generated)
  user_id INTEGER NOT NULL,             -- Owner (FK to users)
  client_id TEXT NOT NULL,              -- Device identifier
  server_seq INTEGER NOT NULL,          -- Global monotonic sequence (The Source of Truth)
  action_type TEXT NOT NULL,            -- NgRx action type (for replay)
  op_type TEXT NOT NULL,                -- CRT | UPD | DEL | MOV | BATCH
  entity_type TEXT NOT NULL,            -- TASK | PROJECT | TAG | etc.
  entity_id TEXT,                       -- Affected entity ID (nullable for batch)
  payload TEXT NOT NULL,                -- JSON: operation payload
  vector_clock TEXT NOT NULL,           -- JSON: { clientId: seq } (Preserved for client logic)
  schema_version INTEGER NOT NULL,      -- Client schema version
  client_timestamp INTEGER NOT NULL,    -- Wall clock from client
  received_at INTEGER NOT NULL,         -- Server timestamp
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for efficient sync queries
CREATE INDEX IF NOT EXISTS idx_ops_user_seq ON operations(user_id, server_seq);
CREATE INDEX IF NOT EXISTS idx_ops_user_entity ON operations(user_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ops_client ON operations(user_id, client_id);

-- Per-user sequence counter (Critical for ordering)
CREATE TABLE IF NOT EXISTS user_sync_state (
  user_id INTEGER PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0,
  last_snapshot_seq INTEGER,            -- Sequence at last snapshot
  snapshot_data BLOB,                   -- Compressed (gzip) full state snapshot
  snapshot_at INTEGER,                  -- When snapshot was created
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Ensure unique server_seq per user (critical for sync correctness)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ops_user_seq_unique ON operations(user_id, server_seq);

-- Device/client tracking
CREATE TABLE IF NOT EXISTS sync_devices (
  client_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  device_name TEXT,
  user_agent TEXT,
  last_seen_at INTEGER NOT NULL,
  last_acked_seq INTEGER NOT NULL DEFAULT 0,  -- Last seq this device confirmed
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, client_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tombstones for deleted entities (prevents resurrection)
CREATE TABLE IF NOT EXISTS tombstones (
  user_id INTEGER NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  deleted_at INTEGER NOT NULL,
  deleted_by_op_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,          -- 90 days after deletion
  PRIMARY KEY (user_id, entity_type, entity_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Cleanup expired tombstones periodically
CREATE INDEX IF NOT EXISTS idx_tombstones_expires ON tombstones(expires_at);
```

### Migration Script

```typescript
// src/db/migrations/002_add_sync_tables.ts
import Database from 'better-sqlite3';

export function migrate(db: Database.Database): void {
  db.exec(`
    -- operations table
    CREATE TABLE IF NOT EXISTS operations (...);
    -- ... rest of schema
  `);
}
```

---

## 2. API Endpoints

### Route Registration

```typescript
// src/sync/sync.routes.ts
import { FastifyInstance } from 'fastify';
import { syncService } from './sync.service';
import { requireAuth } from '../auth/auth.middleware';

export async function syncRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication
  fastify.addHook('preHandler', requireAuth);

  fastify.post('/ops', uploadOpsHandler);
  fastify.get('/ops', downloadOpsHandler);
  fastify.get('/snapshot', getSnapshotHandler);
  fastify.post('/snapshot', uploadSnapshotHandler);
  fastify.get('/status', getStatusHandler);
  fastify.post('/devices/:clientId/ack', ackHandler);
}
```

### POST /api/sync/ops - Upload Operations

```typescript
// Request
interface UploadOpsRequest {
  ops: Operation[];
  clientId: string;
  lastKnownServerSeq?: number; // For conflict detection
}

// Response
interface UploadOpsResponse {
  results: Array<{
    opId: string;
    accepted: boolean;
    serverSeq?: number;
    error?: string;
  }>;
  newOps?: ServerOperation[]; // Piggyback any new ops since lastKnownServerSeq
  latestSeq: number;
}

// Handler
async function uploadOpsHandler(req, reply): Promise<void> {
  const userId = req.user.id;
  const { ops, clientId, lastKnownServerSeq } = req.body;

  // Validate request
  if (!ops?.length || !clientId) {
    return reply.status(400).send({ error: 'Missing ops or clientId' });
  }

  // Rate limit check
  if (await syncService.isRateLimited(userId)) {
    return reply.status(429).send({ error: 'Rate limited' });
  }

  // Process in transaction
  const results = await syncService.uploadOps(userId, clientId, ops);

  // Optionally include new ops from other clients
  let newOps: ServerOperation[] | undefined;
  if (lastKnownServerSeq !== undefined) {
    newOps = await syncService.getOpsSince(userId, lastKnownServerSeq, clientId);
  }

  // Notify other connected clients via WebSocket
  await syncService.broadcastToOtherDevices(userId, clientId);

  reply.send({
    results,
    newOps: newOps?.length ? newOps : undefined,
    latestSeq: await syncService.getLatestSeq(userId),
  });
}
```

### GET /api/sync/ops - Download Operations

```typescript
// Query params
interface DownloadOpsQuery {
  sinceSeq: number; // Required: last known server sequence
  limit?: number; // Optional: max ops (default 500, max 1000)
  excludeClient?: string; // Optional: exclude ops from this client
}

// Response
interface DownloadOpsResponse {
  ops: ServerOperation[];
  hasMore: boolean;
  latestSeq: number;
}

async function downloadOpsHandler(req, reply): Promise<void> {
  const userId = req.user.id;
  const { sinceSeq, limit = 500, excludeClient } = req.query;

  if (sinceSeq === undefined) {
    return reply.status(400).send({ error: 'sinceSeq required' });
  }

  const maxLimit = Math.min(limit, 1000);
  const ops = await syncService.getOpsSince(
    userId,
    sinceSeq,
    excludeClient,
    maxLimit + 1,
  );

  const hasMore = ops.length > maxLimit;
  if (hasMore) ops.pop();

  reply.send({
    ops,
    hasMore,
    latestSeq: await syncService.getLatestSeq(userId),
  });
}
```

### GET /api/sync/snapshot - Get Full State

```typescript
// Response
interface SnapshotResponse {
  state: AllSyncModels;
  serverSeq: number;
  generatedAt: number;
}

async function getSnapshotHandler(req, reply): Promise<void> {
  const userId = req.user.id;

  // Check if we have a cached snapshot
  const cached = await syncService.getCachedSnapshot(userId);
  if (cached && Date.now() - cached.generatedAt < SNAPSHOT_CACHE_TTL) {
    return reply.send(cached);
  }

  // Generate fresh snapshot by replaying ops
  const snapshot = await syncService.generateSnapshot(userId);
  reply.send(snapshot);
}
```

### POST /api/sync/snapshot - Upload Full State

Used for initial sync or extended offline recovery.

```typescript
interface UploadSnapshotRequest {
  state: AllSyncModels;
  clientId: string;
  reason: 'initial' | 'recovery' | 'migration';
}

async function uploadSnapshotHandler(req, reply): Promise<void> {
  const userId = req.user.id;
  const { state, clientId, reason } = req.body;

  // Create a special SYNC_IMPORT operation
  const op: Operation = {
    id: uuidv7(),
    clientId,
    opType: 'SYNC_IMPORT',
    entityType: 'ALL',
    payload: state,
    vectorClock: {}, // Will be set by server
    timestamp: Date.now(),
    schemaVersion: state.schemaVersion ?? 1,
  };

  const result = await syncService.uploadOps(userId, clientId, [op]);

  // Cache the snapshot for other devices
  await syncService.cacheSnapshot(userId, state, result[0].serverSeq);

  reply.send({
    accepted: result[0].accepted,
    serverSeq: result[0].serverSeq,
  });
}
```

### GET /api/sync/status

```typescript
interface StatusResponse {
  latestSeq: number;
  devicesOnline: number;
  pendingOps: number; // Ops since oldest device's lastAckedSeq
  snapshotAge?: number; // Age of cached snapshot
}
```

---

## 3. Core Service Implementation

```typescript
// src/sync/sync.service.ts
import Database from 'better-sqlite3';
import { v7 as uuidv7 } from 'uuid';

export class SyncService {
  private db: Database.Database;
  private stmts: PreparedStatements;

  constructor(db: Database.Database) {
    this.db = db;
    this.prepareStatements();
  }

  private prepareStatements(): void {
    this.stmts = {
      insertOp: this.db.prepare(`
        INSERT INTO operations (
          id, user_id, client_id, server_seq, action_type, op_type,
          entity_type, entity_id, payload, vector_clock, schema_version,
          client_timestamp, received_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),

      getNextSeq: this.db.prepare(`
        UPDATE user_sync_state
        SET last_seq = last_seq + 1
        WHERE user_id = ?
        RETURNING last_seq
      `),

      initUserSeq: this.db.prepare(`
        INSERT OR IGNORE INTO user_sync_state (user_id, last_seq)
        VALUES (?, 0)
      `),

      getOpsSince: this.db.prepare(`
        SELECT * FROM operations
        WHERE user_id = ? AND server_seq > ?
        ORDER BY server_seq ASC
        LIMIT ?
      `),

      getOpsSinceExcludeClient: this.db.prepare(`
        SELECT * FROM operations
        WHERE user_id = ? AND server_seq > ? AND client_id != ?
        ORDER BY server_seq ASC
        LIMIT ?
      `),

      updateDevice: this.db.prepare(`
        INSERT INTO sync_devices (client_id, user_id, last_seen_at, last_acked_seq, created_at)
        VALUES (?, ?, ?, 0, ?)
        ON CONFLICT(user_id, client_id) DO UPDATE SET
          last_seen_at = excluded.last_seen_at
      `),

      getLatestSeq: this.db.prepare(`
        SELECT last_seq FROM user_sync_state WHERE user_id = ?
      `),

      // Snapshot management
      getCachedSnapshot: this.db.prepare(`
        SELECT snapshot_data, last_snapshot_seq, snapshot_at
        FROM user_sync_state WHERE user_id = ?
      `),

      cacheSnapshot: this.db.prepare(`
        UPDATE user_sync_state
        SET snapshot_data = ?, last_snapshot_seq = ?, snapshot_at = ?
        WHERE user_id = ?
      `),

      getAllOps: this.db.prepare(`
        SELECT * FROM operations
        WHERE user_id = ?
        ORDER BY server_seq ASC
      `),

      // Device acknowledgment
      updateDeviceAck: this.db.prepare(`
        UPDATE sync_devices
        SET last_acked_seq = ?, last_seen_at = ?
        WHERE user_id = ? AND client_id = ?
      `),

      // Tombstone management
      insertTombstone: this.db.prepare(`
        INSERT OR REPLACE INTO tombstones
        (user_id, entity_type, entity_id, deleted_at, deleted_by_op_id, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `),

      getTombstone: this.db.prepare(`
        SELECT * FROM tombstones
        WHERE user_id = ? AND entity_type = ? AND entity_id = ?
      `),

      deleteExpiredTombstones: this.db.prepare(`
        DELETE FROM tombstones WHERE expires_at < ?
      `),

      // Cleanup
      deleteOldSyncedOps: this.db.prepare(`
        DELETE FROM operations
        WHERE user_id = ? AND server_seq < ? AND received_at < ?
      `),

      getMinAckedSeq: this.db.prepare(`
        SELECT MIN(last_acked_seq) as min_seq FROM sync_devices WHERE user_id = ?
      `),
    };
  }

  async uploadOps(
    userId: number,
    clientId: string,
    ops: Operation[],
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const now = Date.now();

    // Ensure user has sync state row
    this.stmts.initUserSeq.run(userId);

    // Process in transaction for atomicity
    const tx = this.db.transaction(() => {
      for (const op of ops) {
        try {
          // Validate operation
          const validation = this.validateOp(op);
          if (!validation.valid) {
            results.push({
              opId: op.id,
              accepted: false,
              error: validation.error,
            });
            continue;
          }

          // Get next sequence number
          const { last_seq: serverSeq } = this.stmts.getNextSeq.get(userId);

          // Insert operation
          this.stmts.insertOp.run(
            op.id,
            userId,
            clientId,
            serverSeq,
            op.actionType,
            op.opType,
            op.entityType,
            op.entityId ?? null,
            JSON.stringify(op.payload),
            JSON.stringify(op.vectorClock),
            op.schemaVersion,
            op.timestamp,
            now,
          );

          results.push({
            opId: op.id,
            accepted: true,
            serverSeq,
          });
        } catch (err) {
          // Duplicate ID (already processed)
          if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
            results.push({
              opId: op.id,
              accepted: false,
              error: 'Duplicate operation ID',
            });
          } else {
            throw err;
          }
        }
      }

      // Update device last seen
      this.stmts.updateDevice.run(clientId, userId, now, now);
    });

    tx();

    return results;
  }

  async getOpsSince(
    userId: number,
    sinceSeq: number,
    excludeClient?: string,
    limit: number = 500,
  ): Promise<ServerOperation[]> {
    const stmt = excludeClient
      ? this.stmts.getOpsSinceExcludeClient
      : this.stmts.getOpsSince;

    const args = excludeClient
      ? [userId, sinceSeq, excludeClient, limit]
      : [userId, sinceSeq, limit];

    const rows = stmt.all(...args);

    return rows.map((row) => ({
      serverSeq: row.server_seq,
      op: {
        id: row.id,
        clientId: row.client_id,
        actionType: row.action_type,
        opType: row.op_type,
        entityType: row.entity_type,
        entityId: row.entity_id,
        payload: JSON.parse(row.payload),
        vectorClock: JSON.parse(row.vector_clock),
        schemaVersion: row.schema_version,
        timestamp: row.client_timestamp,
      },
      receivedAt: row.received_at,
    }));
  }

  async getLatestSeq(userId: number): Promise<number> {
    const row = this.stmts.getLatestSeq.get(userId);
    return row?.last_seq ?? 0;
  }

  // --- Snapshot Management ---

  async getCachedSnapshot(
    userId: number,
  ): Promise<{ state: AllSyncModels; serverSeq: number; generatedAt: number } | null> {
    const row = this.stmts.getCachedSnapshot.get(userId);
    if (!row?.snapshot_data) return null;

    // Decompress snapshot
    const decompressed = zlib.gunzipSync(row.snapshot_data).toString('utf-8');
    return {
      state: JSON.parse(decompressed),
      serverSeq: row.last_snapshot_seq,
      generatedAt: row.snapshot_at,
    };
  }

  async cacheSnapshot(
    userId: number,
    state: AllSyncModels,
    serverSeq: number,
  ): Promise<void> {
    const now = Date.now();
    // Compress snapshot to reduce storage
    const compressed = zlib.gzipSync(JSON.stringify(state));

    this.stmts.cacheSnapshot.run(compressed, serverSeq, now, userId);
  }

  async generateSnapshot(
    userId: number,
  ): Promise<{ state: AllSyncModels; serverSeq: number; generatedAt: number }> {
    // Get all operations for this user
    const allOps = this.stmts.getAllOps.all(userId);
    const latestSeq = await this.getLatestSeq(userId);

    // Replay operations to build current state
    const state = this.replayOpsToState(allOps);
    const generatedAt = Date.now();

    // Cache for future requests
    await this.cacheSnapshot(userId, state, latestSeq);

    return { state, serverSeq: latestSeq, generatedAt };
  }

  private replayOpsToState(ops: DbOperation[]): AllSyncModels {
    // Initialize empty state
    const state: AllSyncModels = {
      task: {},
      project: {},
      tag: {},
      simpleCounter: {},
      globalConfig: {} as any,
      // ... other entity types
    };

    // Apply operations in order
    for (const row of ops) {
      const op = {
        opType: row.op_type,
        entityType: row.entity_type.toLowerCase(),
        entityId: row.entity_id,
        payload: JSON.parse(row.payload),
      };

      switch (op.opType) {
        case 'CRT':
        case 'UPD':
          if (op.entityId && state[op.entityType]) {
            state[op.entityType][op.entityId] = {
              ...state[op.entityType][op.entityId],
              ...op.payload,
            };
          }
          break;
        case 'DEL':
          if (op.entityId && state[op.entityType]) {
            delete state[op.entityType][op.entityId];
          }
          break;
        case 'SYNC_IMPORT':
          // Full state import - replace everything
          Object.assign(state, op.payload);
          break;
      }
    }

    return state;
  }

  // --- Device Acknowledgment ---

  async updateDeviceAck(
    userId: number,
    clientId: string,
    lastAckedSeq: number,
  ): Promise<void> {
    this.stmts.updateDeviceAck.run(lastAckedSeq, Date.now(), userId, clientId);
  }

  // --- Rate Limiting ---

  private rateLimitCounters: Map<number, { count: number; resetAt: number }> = new Map();

  isRateLimited(userId: number): boolean {
    const now = Date.now();
    const counter = this.rateLimitCounters.get(userId);
    const limit = RATE_LIMITS.uploadOps;

    if (!counter || now > counter.resetAt) {
      this.rateLimitCounters.set(userId, {
        count: 1,
        resetAt: now + limit.windowMs,
      });
      return false;
    }

    if (counter.count >= limit.max) {
      return true;
    }

    counter.count++;
    return false;
  }

  // --- Tombstone Management ---

  async createTombstone(
    userId: number,
    entityType: string,
    entityId: string,
    deletedByOpId: string,
  ): Promise<void> {
    const now = Date.now();
    const expiresAt = now + TOMBSTONE_RETENTION_MS;

    this.stmts.insertTombstone.run(
      userId,
      entityType,
      entityId,
      now,
      deletedByOpId,
      expiresAt,
    );
  }

  async isTombstoned(
    userId: number,
    entityType: string,
    entityId: string,
  ): Promise<boolean> {
    const row = this.stmts.getTombstone.get(userId, entityType, entityId);
    return !!row;
  }

  // --- Validation ---

  private validateOp(op: Operation): { valid: boolean; error?: string } {
    if (!op.id || typeof op.id !== 'string') {
      return { valid: false, error: 'Invalid operation ID' };
    }
    if (
      !op.opType ||
      !['CRT', 'UPD', 'DEL', 'MOV', 'BATCH', 'SYNC_IMPORT'].includes(op.opType)
    ) {
      return { valid: false, error: 'Invalid opType' };
    }
    if (!op.entityType) {
      return { valid: false, error: 'Missing entityType' };
    }
    if (op.payload === undefined) {
      return { valid: false, error: 'Missing payload' };
    }

    // Size limit
    const payloadSize = JSON.stringify(op.payload).length;
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      return { valid: false, error: 'Payload too large' };
    }

    // Timestamp validation (based on HLC best practices)
    // Reject timestamps too far in the future or past
    const now = Date.now();
    const MAX_CLOCK_DRIFT = 60_000; // 60 seconds tolerance
    const MAX_OP_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

    if (op.timestamp > now + MAX_CLOCK_DRIFT) {
      return { valid: false, error: 'Timestamp too far in future' };
    }
    if (op.timestamp < now - MAX_OP_AGE) {
      return { valid: false, error: 'Operation too old' };
    }

    return { valid: true };
  }
}
```

---

## 4. WebSocket Implementation

### Setup

```typescript
// src/sync/sync.ws.ts
import { FastifyInstance } from 'fastify';
import WebSocket from 'ws';

interface ConnectedClient {
  ws: WebSocket;
  userId: number;
  clientId: string;
}

class SyncWebSocketManager {
  private clients: Map<string, ConnectedClient> = new Map();

  // Key: `${userId}:${clientId}`
  private getKey(userId: number, clientId: string): string {
    return `${userId}:${clientId}`;
  }

  register(ws: WebSocket, userId: number, clientId: string): void {
    const key = this.getKey(userId, clientId);
    this.clients.set(key, { ws, userId, clientId });

    ws.on('close', () => {
      this.clients.delete(key);
    });
  }

  // Notify all devices for a user except the sender
  broadcastToUser(userId: number, excludeClientId: string, message: object): void {
    for (const [key, client] of this.clients) {
      if (client.userId === userId && client.clientId !== excludeClientId) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify(message));
        }
      }
    }
  }

  // Get online device count for a user
  getOnlineCount(userId: number): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.userId === userId) count++;
    }
    return count;
  }
}

export const wsManager = new SyncWebSocketManager();
```

### Route Handler

```typescript
// src/sync/sync.routes.ts (WebSocket endpoint)
export async function registerWebSocket(fastify: FastifyInstance): Promise<void> {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    const ws = connection.socket;

    // Auth via query param or header
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    const user = await verifyToken(token);

    if (!user) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    let clientId: string | null = null;

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'SUBSCRIBE':
            clientId = message.clientId;
            wsManager.register(ws, user.id, clientId);
            ws.send(JSON.stringify({ type: 'SUBSCRIBED' }));
            break;

          case 'PING':
            ws.send(JSON.stringify({ type: 'PONG' }));
            break;

          case 'ACK':
            // Client acknowledges received sequences
            if (clientId && message.lastSeq) {
              await syncService.updateDeviceAck(user.id, clientId, message.lastSeq);
            }
            break;
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'ERROR', error: 'Invalid message' }));
      }
    });

    // Heartbeat
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('close', () => {
      clearInterval(heartbeat);
    });
  });
}
```

### Notification Helper

```typescript
// In sync.service.ts
async broadcastToOtherDevices(userId: number, excludeClientId: string): Promise<void> {
  const latestSeq = await this.getLatestSeq(userId);

  wsManager.broadcastToUser(userId, excludeClientId, {
    type: 'NEW_OPS',
    latestSeq,
  });
}
```

---

## 5. Server Integration

### Update server.ts

```typescript
// src/server.ts
import fastifyWebsocket from '@fastify/websocket';
import { syncRoutes, registerWebSocket } from './sync/sync.routes';

async function start(): Promise<void> {
  const fastify = Fastify({ logger: true });

  // ... existing setup ...

  // WebSocket support
  await fastify.register(fastifyWebsocket);

  // Sync routes
  await fastify.register(syncRoutes, { prefix: '/api/sync' });
  await registerWebSocket(fastify);

  // ... start server ...
}
```

### Rate Limiting

```typescript
// src/sync/rate-limiter.ts
const RATE_LIMITS = {
  uploadOps: { max: 100, windowMs: 60_000 }, // 100 uploads/min
  downloadOps: { max: 200, windowMs: 60_000 }, // 200 downloads/min
};

class RateLimiter {
  private counters: Map<string, { count: number; resetAt: number }> = new Map();

  check(key: string, limit: typeof RATE_LIMITS.uploadOps): boolean {
    const now = Date.now();
    const counter = this.counters.get(key);

    if (!counter || now > counter.resetAt) {
      this.counters.set(key, { count: 1, resetAt: now + limit.windowMs });
      return true;
    }

    if (counter.count >= limit.max) {
      return false;
    }

    counter.count++;
    return true;
  }
}
```

---

## 6. Implementation Phases

### Phase 1: Database & Basic Upload/Download (Week 1)

- [ ] Create database migration script
- [ ] Implement `SyncService` using `better-sqlite3` directly
- [ ] Add `POST /api/sync/ops` endpoint
- [ ] Add `GET /api/sync/ops` endpoint
- [ ] Add basic validation
- [ ] Write unit tests

**Deliverable:** Can upload and download operations via REST API

### Phase 2: WebSocket & Real-Time (Week 2)

- [ ] Add `@fastify/websocket` dependency
- [ ] Implement `SyncWebSocketManager`
- [ ] Add `/api/sync/ws` endpoint
- [ ] Implement subscribe/ping/ack protocol
- [ ] Broadcast notifications on upload
- [ ] Write integration tests

**Deliverable:** Connected clients notified of new operations in real-time

### Phase 3: Snapshot & Recovery (Week 3)

- [ ] Add `GET /api/sync/snapshot` endpoint
- [ ] Add `POST /api/sync/snapshot` endpoint
- [ ] Implement snapshot caching in `user_sync_state`
- [ ] Add `GET /api/sync/status` endpoint
- [ ] Add tombstone table and cleanup job

**Deliverable:** New devices can bootstrap from snapshot

### Phase 4: Hardening (Week 4)

- [ ] Add rate limiting
- [ ] Add request validation schemas (Zod/TypeBox)
- [ ] Add error handling middleware
- [ ] Add logging and metrics
- [ ] Add cleanup job for old tombstones
- [ ] Load testing

**Deliverable:** Production-ready server

---

## 7. Testing Strategy

### Unit Tests

```typescript
// tests/sync.service.test.ts
describe('SyncService', () => {
  let db: Database.Database;
  let service: SyncService;

  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db);
    service = new SyncService(db);
  });

  test('uploadOps assigns sequential server_seq', async () => {
    const ops = [createTestOp(), createTestOp()];
    const results = await service.uploadOps(1, 'client-1', ops);

    expect(results[0].serverSeq).toBe(1);
    expect(results[1].serverSeq).toBe(2);
  });

  test('uploadOps rejects duplicate op IDs', async () => {
    const op = createTestOp();
    await service.uploadOps(1, 'client-1', [op]);
    const results = await service.uploadOps(1, 'client-1', [op]);

    expect(results[0].accepted).toBe(false);
    expect(results[0].error).toContain('Duplicate');
  });

  test('getOpsSince excludes specified client', async () => {
    await service.uploadOps(1, 'client-1', [createTestOp()]);
    await service.uploadOps(1, 'client-2', [createTestOp()]);

    const ops = await service.getOpsSince(1, 0, 'client-1');

    expect(ops).toHaveLength(1);
    expect(ops[0].op.clientId).toBe('client-2');
  });
});
```

### Integration Tests

```typescript
// tests/sync.routes.test.ts
describe('Sync API', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    authToken = await createTestUserAndLogin(app);
  });

  test('POST /api/sync/ops uploads and returns serverSeq', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sync/ops',
      headers: { Authorization: `Bearer ${authToken}` },
      payload: {
        ops: [createTestOp()],
        clientId: 'test-client',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.results[0].accepted).toBe(true);
    expect(body.results[0].serverSeq).toBeDefined();
  });

  test('GET /api/sync/ops returns ops since sequence', async () => {
    // Upload some ops first
    await uploadTestOps(app, authToken, 5);

    const response = await app.inject({
      method: 'GET',
      url: '/api/sync/ops?sinceSeq=2&limit=10',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.ops).toHaveLength(3); // ops 3, 4, 5
  });
});
```

---

## 8. Configuration

```typescript
// src/config.ts
export const syncConfig = {
  // Limits
  maxOpsPerUpload: 100,
  maxPayloadSizeBytes: 1_000_000, // 1MB
  downloadLimit: 1000,

  // Rate limiting
  uploadRateLimit: { max: 100, windowMs: 60_000 },
  downloadRateLimit: { max: 200, windowMs: 60_000 },

  // Tombstones
  tombstoneRetentionDays: 90,
  tombstoneRetentionMs: 90 * 24 * 60 * 60 * 1000, // 90 days in ms

  // Operations retention
  opRetentionDays: 90,
  opRetentionMs: 90 * 24 * 60 * 60 * 1000, // 90 days in ms

  // Snapshots
  snapshotCacheTtlMs: 5 * 60 * 1000, // 5 minutes

  // WebSocket
  wsHeartbeatIntervalMs: 30_000,
  wsMaxConnectionsPerUser: 10,

  // Compression
  compressionThreshold: 10_000, // Compress payloads > 10KB

  // Idempotency
  idempotencyTtlMs: 5 * 60 * 1000, // 5 minutes

  // Device cleanup
  staleDeviceThresholdDays: 90,
  staleDeviceThresholdMs: 90 * 24 * 60 * 60 * 1000,
};

// Export commonly used constants
export const TOMBSTONE_RETENTION_MS = syncConfig.tombstoneRetentionMs;
export const COMPRESSION_THRESHOLD = syncConfig.compressionThreshold;
export const MAX_PAYLOAD_SIZE = syncConfig.maxPayloadSizeBytes;
export const SNAPSHOT_CACHE_TTL = syncConfig.snapshotCacheTtlMs;
export const TTL_5_MIN = syncConfig.idempotencyTtlMs;
export const RATE_LIMITS = {
  uploadOps: syncConfig.uploadRateLimit,
  downloadOps: syncConfig.downloadRateLimit,
};
```

---

## 9. Error Handling

```typescript
// src/sync/sync.errors.ts
export class SyncError extends Error {
  constructor(
    public code: string,
    public httpStatus: number,
    message: string,
  ) {
    super(message);
  }
}

export const SyncErrors = {
  INVALID_OP: new SyncError('INVALID_OP', 400, 'Invalid operation format'),
  RATE_LIMITED: new SyncError('RATE_LIMITED', 429, 'Too many requests'),
  PAYLOAD_TOO_LARGE: new SyncError(
    'PAYLOAD_TOO_LARGE',
    400,
    'Payload exceeds size limit',
  ),
  SCHEMA_MISMATCH: new SyncError(
    'SCHEMA_MISMATCH',
    400,
    'Client schema version not supported',
  ),
};

// Error handler middleware
export function syncErrorHandler(error: Error, req, reply): void {
  if (error instanceof SyncError) {
    reply.status(error.httpStatus).send({
      error: error.code,
      message: error.message,
    });
  } else {
    req.log.error(error);
    reply.status(500).send({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  }
}
```

---

## 10. Idempotency

Ensure operations are processed exactly once, even with network retries.

### Operation Idempotency

```typescript
// Operation IDs (UUID v7) serve as natural idempotency keys
// The PRIMARY KEY constraint on operations.id prevents duplicates

async function uploadOpsHandler(req, reply): Promise<void> {
  const userId = req.user.id;
  const { ops, clientId, idempotencyKey } = req.body;

  // Check for request-level idempotency (optional)
  if (idempotencyKey) {
    const cached = await idempotencyCache.get(userId, idempotencyKey);
    if (cached) {
      return reply.send(cached);
    }
  }

  const results = await syncService.uploadOps(userId, clientId, ops);

  // Cache response for idempotent retries
  if (idempotencyKey) {
    await idempotencyCache.set(userId, idempotencyKey, results, TTL_5_MIN);
  }

  reply.send(results);
}
```

### Idempotency Cache

```typescript
// Simple in-memory cache with TTL (use Redis for multi-server)
class IdempotencyCache {
  private cache: Map<string, { response: unknown; expiresAt: number }> = new Map();

  private getKey(userId: number, key: string): string {
    return `${userId}:${key}`;
  }

  async get(userId: number, key: string): Promise<unknown | null> {
    const cacheKey = this.getKey(userId, key);
    const entry = this.cache.get(cacheKey);

    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.response;
  }

  async set(
    userId: number,
    key: string,
    response: unknown,
    ttlMs: number,
  ): Promise<void> {
    const cacheKey = this.getKey(userId, key);
    this.cache.set(cacheKey, {
      response,
      expiresAt: Date.now() + ttlMs,
    });
  }

  // Cleanup expired entries periodically
  startCleanup(intervalMs: number = 60_000): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, intervalMs);
  }
}

export const idempotencyCache = new IdempotencyCache();
```

---

## 11. Scheduled Cleanup Jobs

### Job Registration

```typescript
// src/jobs/cleanup.jobs.ts
import { CronJob } from 'cron';
import { syncService } from '../sync/sync.service';

export function registerCleanupJobs(): void {
  // Daily tombstone cleanup (2 AM UTC)
  new CronJob('0 2 * * *', () => cleanupExpiredTombstones(), null, true);

  // Daily old operations cleanup (3 AM UTC)
  new CronJob('0 3 * * *', () => cleanupOldOperations(), null, true);

  // Hourly stale device cleanup
  new CronJob('0 * * * *', () => cleanupStaleDevices(), null, true);

  // Every 10 minutes: idempotency cache cleanup
  idempotencyCache.startCleanup(10 * 60 * 1000);
}
```

### Tombstone Cleanup

```typescript
async function cleanupExpiredTombstones(): Promise<void> {
  const now = Date.now();

  try {
    const result = await syncService.deleteExpiredTombstones(now);
    console.log(`Tombstone cleanup: deleted ${result.changes} expired tombstones`);
  } catch (error) {
    console.error('Tombstone cleanup failed:', error);
  }
}

// In SyncService:
async deleteExpiredTombstones(now: number): Promise<{ changes: number }> {
  const result = this.stmts.deleteExpiredTombstones.run(now);
  return { changes: result.changes };
}
```

### Old Operations Cleanup

Based on Cassandra tombstone best practices, safe cleanup requires:

1. **Grace Period** - 90 days minimum (prevents "zombie data" resurrection)
2. **All Devices Acked** - Every registered device must have seen the operation
3. **Tombstone Awareness** - Tombstones must outlive related operations

```typescript
async function cleanupOldOperations(): Promise<void> {
  const config = syncConfig;
  const cutoffTime = Date.now() - config.opRetentionMs; // e.g., 90 days

  try {
    // Get all users with operations
    const users = await syncService.getAllUserIds();

    for (const userId of users) {
      // CRITICAL: Find minimum acknowledged sequence across ALL devices
      // This prevents data resurrection from offline devices
      const minAckedSeq = await syncService.getMinAckedSeq(userId);

      if (minAckedSeq === null) {
        // No devices have acknowledged - skip this user
        // Safety: Never delete if we can't confirm all devices saw it
        continue;
      }

      // Only delete operations that BOTH:
      // 1. Are older than grace period (90 days)
      // 2. Have been acknowledged by all devices (seq < minAckedSeq)
      //
      // This dual requirement prevents:
      // - Zombie data: offline device syncs old data after deletion
      // - Lost updates: device hasn't seen operation yet
      const deleted = await syncService.deleteOldSyncedOps(
        userId,
        minAckedSeq,
        cutoffTime,
      );

      if (deleted > 0) {
        console.log(`User ${userId}: deleted ${deleted} old operations`);
      }
    }
  } catch (error) {
    console.error('Old operations cleanup failed:', error);
  }
}

// In SyncService:
async deleteOldSyncedOps(
  userId: number,
  beforeSeq: number,
  beforeTime: number,
): Promise<number> {
  const result = this.stmts.deleteOldSyncedOps.run(userId, beforeSeq, beforeTime);
  return result.changes;
}

async getMinAckedSeq(userId: number): Promise<number | null> {
  const row = this.stmts.getMinAckedSeq.get(userId);
  return row?.min_seq ?? null;
}
```

### Stale Device Cleanup

```typescript
async function cleanupStaleDevices(): Promise<void> {
  const staleThreshold = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 days

  try {
    const result = await syncService.deleteStaleDevices(staleThreshold);
    if (result.changes > 0) {
      console.log(`Stale device cleanup: removed ${result.changes} devices`);
    }
  } catch (error) {
    console.error('Stale device cleanup failed:', error);
  }
}

// In SyncService (add prepared statement and method):
// Statement:
deleteStaleDevices: this.db.prepare(`
  DELETE FROM sync_devices WHERE last_seen_at < ?
`),

// Method:
async deleteStaleDevices(beforeTime: number): Promise<{ changes: number }> {
  const result = this.stmts.deleteStaleDevices.run(beforeTime);
  return { changes: result.changes };
}
```

---

## 12. Compression

Large payloads are compressed to reduce bandwidth and storage.

### Request/Response Compression

```typescript
// src/server.ts
import fastifyCompress from '@fastify/compress';

async function start(): Promise<void> {
  const fastify = Fastify({ logger: true });

  // Enable compression for responses
  await fastify.register(fastifyCompress, {
    global: true,
    encodings: ['gzip', 'deflate'],
    threshold: 1024, // Only compress responses > 1KB
  });

  // ... rest of setup
}
```

### Payload Compression in Service

```typescript
import * as zlib from 'zlib';

// Compress large operation payloads before storage
function compressIfNeeded(payload: unknown): { data: Buffer; compressed: boolean } {
  const json = JSON.stringify(payload);

  if (json.length > COMPRESSION_THRESHOLD) {
    return {
      data: zlib.gzipSync(json),
      compressed: true,
    };
  }

  return {
    data: Buffer.from(json, 'utf-8'),
    compressed: false,
  };
}

// Decompress when reading
function decompressPayload(data: Buffer, compressed: boolean): unknown {
  if (compressed) {
    const decompressed = zlib.gunzipSync(data).toString('utf-8');
    return JSON.parse(decompressed);
  }
  return JSON.parse(data.toString('utf-8'));
}

// Updated schema to track compression
// ALTER TABLE operations ADD COLUMN payload_compressed BOOLEAN DEFAULT FALSE;
```

### Snapshot Compression

Snapshots are always compressed (see `cacheSnapshot` method in Section 3).

---

## 13. Conflict Strategy (Server-Side)

The server acts as the **Linearization Point** (Source of Truth).

1.  **Ordering:** The server assigns a strictly increasing `server_seq` to every incoming operation. This defines the global order of events.
2.  **Acceptance:** The server generally accepts all valid operations (schema valid, authorized). It does not try to "merge" JSON payloads itself.
3.  **Resolution (Client-Side):**
    - When a client uploads an op, if the server accepts it, that op is now part of the history.
    - When a client downloads ops, it sees operations from others.
    - If a downloaded op has a `server_seq` that conflicts with a local pending op (i.e., the client was basing its work on an older `server_seq`), the **Client** is responsible for "rebasing" or "merging" its local change on top of the new server state.

**Why this approach?**
It keeps the server fast, simple, and agnostic to domain logic. It supports End-to-End Encryption (E2EE) in the future, as the server doesn't need to read the payload to order it.

---

## References

- [Server Sync Architecture](./server-sync-architecture.md) - Detailed algorithms and design
- [Operation Log Sync Research](./operation-log-sync-research.md) - Industry best practices (Replicache, Linear, Figma)
- [Operation Log Architecture](./operation-log-architecture.md) - Client-side system
- [Execution Plan](./operation-log-execution-plan.md) - Client implementation tasks

### External References

- [Replicache Documentation](https://doc.replicache.dev/)
- [Linear Sync Engine](https://github.com/wzhudev/reverse-linear-sync-engine)
- [Figma LiveGraph](https://www.figma.com/blog/livegraph-real-time-data-fetching-at-figma/)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initDb, getDb } from '../src/db';
import { initSyncService, getSyncService, SyncService } from '../src/sync/sync.service';
import { Operation, DEFAULT_SYNC_CONFIG } from '../src/sync/sync.types';
import { uuidv7 } from 'uuidv7';

describe('SyncService', () => {
  const userId = 1;
  const clientId = 'test-device-1';

  beforeEach(() => {
    // Initialize in-memory database
    initDb('./data', true);
    const db = getDb();

    // Create a dummy user to satisfy Foreign Key constraints
    db.prepare(
      `
      INSERT INTO users (id, email, password_hash, is_verified, created_at)
      VALUES (?, 'test@test.com', 'hash', 1, ?)
    `,
    ).run(userId, Date.now());

    // Initialize service
    initSyncService();
  });

  describe('uploadOps', () => {
    it('should correctly upload operations', () => {
      const service = getSyncService();
      const op: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'ADD_TASK',
        opType: 'CRT',
        entityType: 'TASK',
        entityId: 'task-1',
        payload: { title: 'Test Task' },
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      const results = service.uploadOps(userId, clientId, [op]);

      expect(results).toHaveLength(1);
      expect(results[0].accepted).toBe(true);
      expect(results[0].serverSeq).toBe(1);

      const latestSeq = service.getLatestSeq(userId);
      expect(latestSeq).toBe(1);
    });

    it('should handle multiple operations in order', () => {
      const service = getSyncService();
      const ops: Operation[] = [
        {
          id: uuidv7(),
          clientId,
          actionType: 'ADD_TASK',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 'task-1',
          payload: { title: 'Task 1' },
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
        {
          id: uuidv7(),
          clientId,
          actionType: 'ADD_TASK',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 'task-2',
          payload: { title: 'Task 2' },
          vectorClock: {},
          timestamp: Date.now() + 1,
          schemaVersion: 1,
        },
      ];

      const results = service.uploadOps(userId, clientId, ops);

      expect(results).toHaveLength(2);
      expect(results[0].serverSeq).toBe(1);
      expect(results[1].serverSeq).toBe(2);
    });

    it('should reject duplicate operation IDs (idempotency)', () => {
      const service = getSyncService();
      const opId = uuidv7();
      const op: Operation = {
        id: opId,
        clientId,
        actionType: 'ADD_TASK',
        opType: 'CRT',
        entityType: 'TASK',
        entityId: 'task-1',
        payload: { title: 'Test Task' },
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      // First upload should succeed
      const firstResults = service.uploadOps(userId, clientId, [op]);
      expect(firstResults[0].accepted).toBe(true);

      // Second upload with same ID should be rejected
      const secondResults = service.uploadOps(userId, clientId, [op]);
      expect(secondResults[0].accepted).toBe(false);
      expect(secondResults[0].error).toBe('Duplicate operation ID');
    });

    it('should update device last seen timestamp', () => {
      const service = getSyncService();
      const db = getDb();
      const beforeUpload = Date.now();

      const op: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'ADD_TASK',
        opType: 'CRT',
        entityType: 'TASK',
        entityId: 'task-1',
        payload: { title: 'Test Task' },
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      service.uploadOps(userId, clientId, [op]);

      const device = db
        .prepare('SELECT * FROM sync_devices WHERE user_id = ? AND client_id = ?')
        .get(userId, clientId) as { last_seen_at: number } | undefined;

      expect(device).toBeDefined();
      expect(device!.last_seen_at).toBeGreaterThanOrEqual(beforeUpload);
    });
  });

  describe('validation', () => {
    it('should reject operations with invalid opType', () => {
      const service = getSyncService();
      const op = {
        id: uuidv7(),
        clientId,
        actionType: 'ADD_TASK',
        opType: 'INVALID' as Operation['opType'],
        entityType: 'TASK',
        entityId: 'task-1',
        payload: { title: 'Test Task' },
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      const results = service.uploadOps(userId, clientId, [op]);

      expect(results[0].accepted).toBe(false);
      expect(results[0].error).toBe('Invalid opType');
    });

    it('should reject operations with missing entityType', () => {
      const service = getSyncService();
      const op = {
        id: uuidv7(),
        clientId,
        actionType: 'ADD_TASK',
        opType: 'CRT' as const,
        entityType: '',
        entityId: 'task-1',
        payload: { title: 'Test Task' },
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      const results = service.uploadOps(userId, clientId, [op]);

      expect(results[0].accepted).toBe(false);
      expect(results[0].error).toBe('Missing entityType');
    });

    it('should reject operations with missing payload', () => {
      const service = getSyncService();
      const op = {
        id: uuidv7(),
        clientId,
        actionType: 'ADD_TASK',
        opType: 'CRT' as const,
        entityType: 'TASK',
        entityId: 'task-1',
        payload: undefined,
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      } as unknown as Operation;

      const results = service.uploadOps(userId, clientId, [op]);

      expect(results[0].accepted).toBe(false);
      expect(results[0].error).toBe('Missing payload');
    });

    it('should reject operations with invalid ID', () => {
      const service = getSyncService();
      const op = {
        id: '',
        clientId,
        actionType: 'ADD_TASK',
        opType: 'CRT' as const,
        entityType: 'TASK',
        entityId: 'task-1',
        payload: { title: 'Test Task' },
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      const results = service.uploadOps(userId, clientId, [op]);

      expect(results[0].accepted).toBe(false);
      expect(results[0].error).toBe('Invalid operation ID');
    });

    it('should reject operations with timestamp too far in the future', () => {
      const service = getSyncService();
      const farFuture = Date.now() + DEFAULT_SYNC_CONFIG.maxClockDriftMs + 10000;

      const op: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'ADD_TASK',
        opType: 'CRT',
        entityType: 'TASK',
        entityId: 'task-1',
        payload: { title: 'Test Task' },
        vectorClock: {},
        timestamp: farFuture,
        schemaVersion: 1,
      };

      const results = service.uploadOps(userId, clientId, [op]);

      expect(results[0].accepted).toBe(false);
      expect(results[0].error).toBe('Timestamp too far in future');
    });

    it('should reject operations that are too old', () => {
      const service = getSyncService();
      const tooOld = Date.now() - DEFAULT_SYNC_CONFIG.maxOpAgeMs - 10000;

      const op: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'ADD_TASK',
        opType: 'CRT',
        entityType: 'TASK',
        entityId: 'task-1',
        payload: { title: 'Test Task' },
        vectorClock: {},
        timestamp: tooOld,
        schemaVersion: 1,
      };

      const results = service.uploadOps(userId, clientId, [op]);

      expect(results[0].accepted).toBe(false);
      expect(results[0].error).toBe('Operation too old');
    });

    it('should reject operations with payload exceeding size limit', () => {
      // Create service with small payload limit for testing
      const testService = new (SyncService as any)({
        maxPayloadSizeBytes: 100,
      });

      const largePayload = { data: 'x'.repeat(200) };
      const op: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'ADD_TASK',
        opType: 'CRT',
        entityType: 'TASK',
        entityId: 'task-1',
        payload: largePayload,
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      const results = testService.uploadOps(userId, clientId, [op]);

      expect(results[0].accepted).toBe(false);
      expect(results[0].error).toBe('Payload too large');
    });

    it('should reject complex payloads for regular operations', () => {
      const service = getSyncService();

      // Create a deeply nested object that exceeds complexity limits
      const createDeeplyNested = (depth: number): Record<string, unknown> => {
        if (depth === 0) return { value: 'leaf' };
        return { nested: createDeeplyNested(depth - 1) };
      };

      const op: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'UPDATE_TASK',
        opType: 'UPD',
        entityType: 'TASK',
        entityId: 'task-1',
        payload: createDeeplyNested(25), // Exceeds max depth of 20
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      const results = service.uploadOps(userId, clientId, [op]);

      expect(results[0].accepted).toBe(false);
      expect(results[0].error).toBe('Payload too complex (max depth 20, max keys 20000)');
    });

    it('should accept complex payloads for SYNC_IMPORT operations', () => {
      const service = getSyncService();

      // Create a deeply nested object that would fail complexity check for regular ops
      const createDeeplyNested = (depth: number): Record<string, unknown> => {
        if (depth === 0) return { value: 'leaf' };
        return { nested: createDeeplyNested(depth - 1) };
      };

      const op: Operation = {
        id: uuidv7(),
        clientId,
        actionType: '[SP_ALL] Load(import) all data',
        opType: 'SYNC_IMPORT',
        entityType: 'ALL',
        payload: createDeeplyNested(25), // Exceeds max depth of 20 but allowed for SYNC_IMPORT
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      const results = service.uploadOps(userId, clientId, [op]);

      expect(results[0].accepted).toBe(true);
      expect(results[0].serverSeq).toBeDefined();
    });

    it('should accept complex payloads for BACKUP_IMPORT operations', () => {
      const service = getSyncService();

      // Create an object with many keys that would fail complexity check
      const manyKeys: Record<string, string> = {};
      for (let i = 0; i < 25000; i++) {
        manyKeys[`key${i}`] = `value${i}`;
      }

      const op: Operation = {
        id: uuidv7(),
        clientId,
        actionType: '[SP_ALL] Load(import) all data',
        opType: 'BACKUP_IMPORT',
        entityType: 'ALL',
        payload: manyKeys, // Exceeds max keys of 20000 but allowed for BACKUP_IMPORT
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      const results = service.uploadOps(userId, clientId, [op]);

      expect(results[0].accepted).toBe(true);
      expect(results[0].serverSeq).toBeDefined();
    });

    it('should accept complex payloads for REPAIR operations', () => {
      const service = getSyncService();

      // Create a deeply nested object
      const createDeeplyNested = (depth: number): Record<string, unknown> => {
        if (depth === 0) return { value: 'leaf' };
        return { nested: createDeeplyNested(depth - 1) };
      };

      const op: Operation = {
        id: uuidv7(),
        clientId,
        actionType: '[SP_ALL] Load(import) all data',
        opType: 'REPAIR',
        entityType: 'ALL',
        payload: createDeeplyNested(25), // Exceeds max depth of 20 but allowed for REPAIR
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      const results = service.uploadOps(userId, clientId, [op]);

      expect(results[0].accepted).toBe(true);
      expect(results[0].serverSeq).toBeDefined();
    });
  });

  describe('getOpsSince', () => {
    it('should return operations after given sequence', () => {
      const service = getSyncService();

      // Upload 5 operations
      for (let i = 1; i <= 5; i++) {
        const op: Operation = {
          id: uuidv7(),
          clientId,
          actionType: 'ADD_TASK',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: `task-${i}`,
          payload: { title: `Task ${i}` },
          vectorClock: {},
          timestamp: Date.now() + i,
          schemaVersion: 1,
        };
        service.uploadOps(userId, clientId, [op]);
      }

      const ops = service.getOpsSince(userId, 2);

      expect(ops).toHaveLength(3);
      expect(ops[0].serverSeq).toBe(3);
      expect(ops[1].serverSeq).toBe(4);
      expect(ops[2].serverSeq).toBe(5);
    });

    it('should exclude operations from specified client', () => {
      const service = getSyncService();
      const client1 = 'client-1';
      const client2 = 'client-2';

      // Upload from client 1
      service.uploadOps(userId, client1, [
        {
          id: uuidv7(),
          clientId: client1,
          actionType: 'ADD_TASK',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 'task-1',
          payload: { title: 'Task 1' },
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      // Upload from client 2
      service.uploadOps(userId, client2, [
        {
          id: uuidv7(),
          clientId: client2,
          actionType: 'ADD_TASK',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 'task-2',
          payload: { title: 'Task 2' },
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      const ops = service.getOpsSince(userId, 0, client1);

      expect(ops).toHaveLength(1);
      expect(ops[0].op.entityId).toBe('task-2');
    });

    it('should respect limit parameter', () => {
      const service = getSyncService();

      // Upload 10 operations
      for (let i = 1; i <= 10; i++) {
        service.uploadOps(userId, clientId, [
          {
            id: uuidv7(),
            clientId,
            actionType: 'ADD_TASK',
            opType: 'CRT',
            entityType: 'TASK',
            entityId: `task-${i}`,
            payload: { title: `Task ${i}` },
            vectorClock: {},
            timestamp: Date.now() + i,
            schemaVersion: 1,
          },
        ]);
      }

      const ops = service.getOpsSince(userId, 0, undefined, 3);

      expect(ops).toHaveLength(3);
    });

    it('should return empty array when no operations exist', () => {
      const service = getSyncService();

      const ops = service.getOpsSince(userId, 0);

      expect(ops).toHaveLength(0);
    });
  });

  describe('snapshots', () => {
    it('should reconstruct state from operations (snapshot)', () => {
      const service = getSyncService();

      // Op 1: Create Task
      const op1: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'ADD',
        opType: 'CRT',
        entityType: 'TASK',
        entityId: 't1',
        payload: { title: 'Task 1', done: false },
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      // Op 2: Update Task
      const op2: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'UPDATE',
        opType: 'UPD',
        entityType: 'TASK',
        entityId: 't1',
        payload: { done: true },
        vectorClock: {},
        timestamp: Date.now() + 100,
        schemaVersion: 1,
      };

      service.uploadOps(userId, clientId, [op1, op2]);

      const snapshot = service.generateSnapshot(userId);

      expect(snapshot.serverSeq).toBe(2);

      const state = snapshot.state as Record<
        string,
        Record<string, { title: string; done: boolean }>
      >;
      expect(state.TASK).toBeDefined();
      expect(state.TASK.t1).toBeDefined();
      expect(state.TASK.t1.title).toBe('Task 1');
      expect(state.TASK.t1.done).toBe(true);
    });

    it('should use incremental snapshots', () => {
      const service = getSyncService();

      // Step 1: Initial State
      const op1: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'ADD',
        opType: 'CRT',
        entityType: 'NOTE',
        entityId: 'n1',
        payload: { text: 'Note 1' },
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };
      service.uploadOps(userId, clientId, [op1]);

      // Generate first snapshot (caches it)
      const snap1 = service.generateSnapshot(userId);
      expect(snap1.serverSeq).toBe(1);
      expect(
        (snap1.state as Record<string, Record<string, { text: string }>>).NOTE.n1.text,
      ).toBe('Note 1');

      // Step 2: Add more operations
      const op2: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'ADD',
        opType: 'CRT',
        entityType: 'NOTE',
        entityId: 'n2',
        payload: { text: 'Note 2' },
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };
      service.uploadOps(userId, clientId, [op2]);

      // Generate second snapshot
      // This should internally use the cached state from snap1 and apply op2
      const snap2 = service.generateSnapshot(userId);

      expect(snap2.serverSeq).toBe(2);
      const state = snap2.state as Record<string, Record<string, { text: string }>>;
      expect(state.NOTE.n1.text).toBe('Note 1'); // Preserved
      expect(state.NOTE.n2.text).toBe('Note 2'); // Added
    });

    it('should handle deletions in snapshots', () => {
      const service = getSyncService();

      // Create
      const op1: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'ADD',
        opType: 'CRT',
        entityType: 'TAG',
        entityId: 'tg1',
        payload: { title: 'Tag 1' },
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };
      service.uploadOps(userId, clientId, [op1]);

      service.generateSnapshot(userId); // Checkpoint

      // Delete
      const op2: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'DEL',
        opType: 'DEL',
        entityType: 'TAG',
        entityId: 'tg1',
        payload: {},
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };
      service.uploadOps(userId, clientId, [op2]);

      const snap = service.generateSnapshot(userId);
      const state = snap.state as Record<string, Record<string, unknown>>;

      expect(state.TAG.tg1).toBeUndefined();
    });

    it('should handle MOV operations', () => {
      const service = getSyncService();

      // Create task
      const op1: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'ADD',
        opType: 'CRT',
        entityType: 'TASK',
        entityId: 't1',
        payload: { title: 'Task 1', parentId: null },
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };
      service.uploadOps(userId, clientId, [op1]);

      // Move task
      const op2: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'MOVE',
        opType: 'MOV',
        entityType: 'TASK',
        entityId: 't1',
        payload: { parentId: 'p1' },
        vectorClock: {},
        timestamp: Date.now() + 100,
        schemaVersion: 1,
      };
      service.uploadOps(userId, clientId, [op2]);

      const snap = service.generateSnapshot(userId);
      const state = snap.state as Record<string, Record<string, { parentId: string }>>;

      expect(state.TASK.t1.parentId).toBe('p1');
    });

    it('should handle BATCH operations with entities payload', () => {
      const service = getSyncService();

      const op: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'BATCH_UPDATE',
        opType: 'BATCH',
        entityType: 'TASK',
        payload: {
          entities: {
            t1: { title: 'Task 1', done: false },
            t2: { title: 'Task 2', done: true },
          },
        },
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };
      service.uploadOps(userId, clientId, [op]);

      const snap = service.generateSnapshot(userId);
      const state = snap.state as Record<
        string,
        Record<string, { title: string; done: boolean }>
      >;

      expect(state.TASK.t1.title).toBe('Task 1');
      expect(state.TASK.t2.done).toBe(true);
    });

    it('should return cached snapshot if up to date', () => {
      const service = getSyncService();

      const op: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'ADD',
        opType: 'CRT',
        entityType: 'TASK',
        entityId: 't1',
        payload: { title: 'Task 1' },
        vectorClock: {},
        timestamp: Date.now(),
        schemaVersion: 1,
      };
      service.uploadOps(userId, clientId, [op]);

      // Generate and cache
      const snap1 = service.generateSnapshot(userId);

      // Call again - should return cached
      const snap2 = service.generateSnapshot(userId);

      expect(snap1.serverSeq).toBe(snap2.serverSeq);
      expect(snap1.state).toEqual(snap2.state);
    });
  });

  describe('tombstones', () => {
    it('should create tombstone on delete operation', () => {
      const service = getSyncService();

      // Create then delete
      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: 'ADD',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 't1',
          payload: { title: 'Task 1' },
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: 'DELETE',
          opType: 'DEL',
          entityType: 'TASK',
          entityId: 't1',
          payload: {},
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      expect(service.isTombstoned(userId, 'TASK', 't1')).toBe(true);
    });

    it('should return false for non-tombstoned entities', () => {
      const service = getSyncService();

      expect(service.isTombstoned(userId, 'TASK', 'nonexistent')).toBe(false);
    });

    it('should delete expired tombstones', () => {
      const service = getSyncService();
      const db = getDb();

      // Manually insert expired tombstone
      const expiredTime = Date.now() - 1000;
      db.prepare(
        `
        INSERT INTO tombstones (user_id, entity_type, entity_id, deleted_at, deleted_by_op_id, expires_at)
        VALUES (?, 'TASK', 't-expired', ?, 'op-1', ?)
      `,
      ).run(userId, Date.now(), expiredTime);

      expect(service.isTombstoned(userId, 'TASK', 't-expired')).toBe(true);

      const deleted = service.deleteExpiredTombstones();

      expect(deleted).toBe(1);
      expect(service.isTombstoned(userId, 'TASK', 't-expired')).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should delete old operations (time-based)', () => {
      const service = getSyncService();
      const db = getDb();

      // Upload operations
      for (let i = 1; i <= 5; i++) {
        service.uploadOps(userId, clientId, [
          {
            id: uuidv7(),
            clientId,
            actionType: 'ADD',
            opType: 'CRT',
            entityType: 'TASK',
            entityId: `t${i}`,
            payload: {},
            vectorClock: {},
            timestamp: Date.now(),
            schemaVersion: 1,
          },
        ]);
      }

      // Manually set old received_at to simulate old operations
      db.prepare('UPDATE operations SET received_at = ? WHERE server_seq <= 2').run(
        Date.now() - 100 * 24 * 60 * 60 * 1000, // 100 days ago
      );

      // Time-based cleanup: delete ops received before cutoff
      const cutoffTime = Date.now() - 50 * 24 * 60 * 60 * 1000; // 50 days ago
      const deleted = service.deleteOldSyncedOpsForAllUsers(cutoffTime);

      expect(deleted).toBe(2);

      const remaining = service.getOpsSince(userId, 0);
      expect(remaining).toHaveLength(3);
    });

    it('should delete old operations from all users', () => {
      const service = getSyncService();
      const db = getDb();

      // Create second user for this test
      const user2Id = 2;
      db.prepare(
        `INSERT INTO users (id, email, password_hash, is_verified, created_at)
         VALUES (?, 'test2@test.com', 'hash', 1, ?)`,
      ).run(user2Id, Date.now());

      // Upload ops for user 1
      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: 'ADD',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 't1',
          payload: {},
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      // Upload ops for user 2
      service.uploadOps(user2Id, 'client-2', [
        {
          id: uuidv7(),
          clientId: 'client-2',
          actionType: 'ADD',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 't2',
          payload: {},
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      // Make all ops old
      db.prepare('UPDATE operations SET received_at = ?').run(
        Date.now() - 100 * 24 * 60 * 60 * 1000, // 100 days ago
      );

      // Delete ops older than 50 days
      const cutoffTime = Date.now() - 50 * 24 * 60 * 60 * 1000;
      const deleted = service.deleteOldSyncedOpsForAllUsers(cutoffTime);

      expect(deleted).toBe(2); // Both users' ops deleted

      expect(service.getOpsSince(userId, 0)).toHaveLength(0);
      expect(service.getOpsSince(user2Id, 0)).toHaveLength(0);
    });

    it('should delete stale devices', () => {
      const service = getSyncService();
      const db = getDb();

      // Create device by uploading
      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: 'ADD',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 't1',
          payload: {},
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      // Make device stale (100 days ago)
      db.prepare('UPDATE sync_devices SET last_seen_at = ? WHERE client_id = ?').run(
        Date.now() - 100 * 24 * 60 * 60 * 1000,
        clientId,
      );

      // Delete devices not seen in 50 days
      const deleted = service.deleteStaleDevices(Date.now() - 50 * 24 * 60 * 60 * 1000);

      expect(deleted).toBe(1);
    });

    it('should not delete recent operations', () => {
      const service = getSyncService();

      // Upload recent operations
      for (let i = 1; i <= 3; i++) {
        service.uploadOps(userId, clientId, [
          {
            id: uuidv7(),
            clientId,
            actionType: 'ADD',
            opType: 'CRT',
            entityType: 'TASK',
            entityId: `t${i}`,
            payload: {},
            vectorClock: {},
            timestamp: Date.now(),
            schemaVersion: 1,
          },
        ]);
      }

      // Try to delete with 50-day cutoff - should delete nothing since ops are fresh
      const cutoffTime = Date.now() - 50 * 24 * 60 * 60 * 1000;
      const deleted = service.deleteOldSyncedOpsForAllUsers(cutoffTime);

      expect(deleted).toBe(0);
      expect(service.getOpsSince(userId, 0)).toHaveLength(3);
    });

    it('should not delete recent devices', () => {
      const service = getSyncService();

      // Create device by uploading (device will have current timestamp)
      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: 'ADD',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 't1',
          payload: {},
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      // Try to delete with 50-day cutoff - should delete nothing since device is fresh
      const deleted = service.deleteStaleDevices(Date.now() - 50 * 24 * 60 * 60 * 1000);

      expect(deleted).toBe(0);
    });
  });

  describe('rate limiting', () => {
    it('should not rate limit initially', () => {
      const service = getSyncService();

      expect(service.isRateLimited(userId)).toBe(false);
    });

    it('should rate limit after exceeding max requests', () => {
      // Create service with low rate limit for testing
      const testService = new (SyncService as any)({
        uploadRateLimit: { max: 2, windowMs: 60000 },
      });

      // First request
      expect(testService.isRateLimited(userId)).toBe(false);
      // Second request
      expect(testService.isRateLimited(userId)).toBe(false);
      // Third request - should be rate limited
      expect(testService.isRateLimited(userId)).toBe(true);
    });

    it('should reset rate limit after window expires', () => {
      vi.useFakeTimers();

      const testService = new (SyncService as any)({
        uploadRateLimit: { max: 1, windowMs: 1000 },
      });

      // Use up the limit
      expect(testService.isRateLimited(userId)).toBe(false);
      expect(testService.isRateLimited(userId)).toBe(true);

      // Advance time past window
      vi.advanceTimersByTime(1500);

      // Should be reset
      expect(testService.isRateLimited(userId)).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('online device count', () => {
    it('should count recently seen devices as online', () => {
      const service = getSyncService();

      // Create devices by uploading
      service.uploadOps(userId, 'device-1', [
        {
          id: uuidv7(),
          clientId: 'device-1',
          actionType: 'ADD',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 't1',
          payload: {},
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      service.uploadOps(userId, 'device-2', [
        {
          id: uuidv7(),
          clientId: 'device-2',
          actionType: 'ADD',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 't2',
          payload: {},
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      const onlineCount = service.getOnlineDeviceCount(userId);

      expect(onlineCount).toBe(2);
    });

    it('should not count stale devices as online', () => {
      const service = getSyncService();
      const db = getDb();

      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: 'ADD',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 't1',
          payload: {},
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      // Make device stale (last seen 10 minutes ago)
      db.prepare('UPDATE sync_devices SET last_seen_at = ? WHERE client_id = ?').run(
        Date.now() - 10 * 60 * 1000,
        clientId,
      );

      const onlineCount = service.getOnlineDeviceCount(userId);

      expect(onlineCount).toBe(0);
    });
  });

  describe('getAllUserIds', () => {
    it('should return all users with sync state', () => {
      const db = getDb();

      // Create another user
      db.prepare(
        `INSERT INTO users (id, email, password_hash, is_verified, created_at)
         VALUES (?, 'user2@test.com', 'hash', 1, ?)`,
      ).run(2, Date.now());

      const service = getSyncService();

      // Initialize sync state for both users via upload
      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: 'ADD',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 't1',
          payload: {},
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      service.uploadOps(2, 'device-2', [
        {
          id: uuidv7(),
          clientId: 'device-2',
          actionType: 'ADD',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 't2',
          payload: {},
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      const userIds = service.getAllUserIds();

      expect(userIds).toContain(userId);
      expect(userIds).toContain(2);
      expect(userIds).toHaveLength(2);
    });
  });

  describe('getRestorePoints', () => {
    it('should return empty array when no restore points exist', async () => {
      const service = getSyncService();

      // Upload regular operations (not restore points)
      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: 'ADD_TASK',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 'task-1',
          payload: { title: 'Test Task' },
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      const restorePoints = await service.getRestorePoints(userId);

      expect(restorePoints).toHaveLength(0);
    });

    it('should return SYNC_IMPORT operations as restore points', async () => {
      const service = getSyncService();
      const timestamp = Date.now();

      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: '[SP_ALL] Load(import) all data',
          opType: 'SYNC_IMPORT',
          entityType: 'ALL',
          payload: { globalConfig: {}, tasks: {} },
          vectorClock: {},
          timestamp,
          schemaVersion: 1,
        },
      ]);

      const restorePoints = await service.getRestorePoints(userId);

      expect(restorePoints).toHaveLength(1);
      expect(restorePoints[0].type).toBe('SYNC_IMPORT');
      expect(restorePoints[0].serverSeq).toBe(1);
      expect(restorePoints[0].clientId).toBe(clientId);
      expect(restorePoints[0].description).toBe('Full sync import');
    });

    it('should return BACKUP_IMPORT operations as restore points', async () => {
      const service = getSyncService();

      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: '[SP_ALL] Load(import) all data',
          opType: 'BACKUP_IMPORT',
          entityType: 'ALL',
          payload: { globalConfig: {}, tasks: {} },
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      const restorePoints = await service.getRestorePoints(userId);

      expect(restorePoints).toHaveLength(1);
      expect(restorePoints[0].type).toBe('BACKUP_IMPORT');
      expect(restorePoints[0].description).toBe('Backup restore');
    });

    it('should return REPAIR operations as restore points', async () => {
      const service = getSyncService();

      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: '[SP_ALL] Load(import) all data',
          opType: 'REPAIR',
          entityType: 'ALL',
          payload: { globalConfig: {}, tasks: {} },
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      const restorePoints = await service.getRestorePoints(userId);

      expect(restorePoints).toHaveLength(1);
      expect(restorePoints[0].type).toBe('REPAIR');
      expect(restorePoints[0].description).toBe('Auto-repair');
    });

    it('should return restore points in descending order by serverSeq', async () => {
      const service = getSyncService();

      // Upload multiple restore points
      for (let i = 1; i <= 3; i++) {
        service.uploadOps(userId, clientId, [
          {
            id: uuidv7(),
            clientId,
            actionType: '[SP_ALL] Load(import) all data',
            opType: 'SYNC_IMPORT',
            entityType: 'ALL',
            payload: { version: i },
            vectorClock: {},
            timestamp: Date.now() + i,
            schemaVersion: 1,
          },
        ]);
      }

      const restorePoints = await service.getRestorePoints(userId);

      expect(restorePoints).toHaveLength(3);
      expect(restorePoints[0].serverSeq).toBe(3);
      expect(restorePoints[1].serverSeq).toBe(2);
      expect(restorePoints[2].serverSeq).toBe(1);
    });

    it('should respect limit parameter', async () => {
      const service = getSyncService();

      // Upload 5 restore points
      for (let i = 1; i <= 5; i++) {
        service.uploadOps(userId, clientId, [
          {
            id: uuidv7(),
            clientId,
            actionType: '[SP_ALL] Load(import) all data',
            opType: 'SYNC_IMPORT',
            entityType: 'ALL',
            payload: { version: i },
            vectorClock: {},
            timestamp: Date.now() + i,
            schemaVersion: 1,
          },
        ]);
      }

      const restorePoints = await service.getRestorePoints(userId, 2);

      expect(restorePoints).toHaveLength(2);
      expect(restorePoints[0].serverSeq).toBe(5);
      expect(restorePoints[1].serverSeq).toBe(4);
    });

    it('should only return restore point types, not regular operations', async () => {
      const service = getSyncService();

      // Upload mixed operations
      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: 'ADD_TASK',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 'task-1',
          payload: { title: 'Task 1' },
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: '[SP_ALL] Load(import) all data',
          opType: 'SYNC_IMPORT',
          entityType: 'ALL',
          payload: { globalConfig: {} },
          vectorClock: {},
          timestamp: Date.now() + 1,
          schemaVersion: 1,
        },
      ]);

      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: 'UPDATE_TASK',
          opType: 'UPD',
          entityType: 'TASK',
          entityId: 'task-1',
          payload: { done: true },
          vectorClock: {},
          timestamp: Date.now() + 2,
          schemaVersion: 1,
        },
      ]);

      const restorePoints = await service.getRestorePoints(userId);

      expect(restorePoints).toHaveLength(1);
      expect(restorePoints[0].type).toBe('SYNC_IMPORT');
      expect(restorePoints[0].serverSeq).toBe(2);
    });
  });

  describe('generateSnapshotAtSeq', () => {
    it('should generate snapshot at a specific serverSeq', async () => {
      const service = getSyncService();

      // Upload 3 operations
      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: 'ADD',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 't1',
          payload: { title: 'Task 1', done: false },
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: 'ADD',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 't2',
          payload: { title: 'Task 2', done: false },
          vectorClock: {},
          timestamp: Date.now() + 1,
          schemaVersion: 1,
        },
      ]);

      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: 'UPDATE',
          opType: 'UPD',
          entityType: 'TASK',
          entityId: 't1',
          payload: { done: true },
          vectorClock: {},
          timestamp: Date.now() + 2,
          schemaVersion: 1,
        },
      ]);

      // Get snapshot at seq 2 (before the update)
      const snapshot = await service.generateSnapshotAtSeq(userId, 2);

      expect(snapshot.serverSeq).toBe(2);
      const state = snapshot.state as Record<
        string,
        Record<string, { title: string; done: boolean }>
      >;
      expect(state.TASK.t1.done).toBe(false); // Not yet updated
      expect(state.TASK.t2).toBeDefined();
    });

    it('should throw error for targetSeq exceeding latest', async () => {
      const service = getSyncService();

      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: 'ADD',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 't1',
          payload: { title: 'Task 1' },
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      await expect(service.generateSnapshotAtSeq(userId, 100)).rejects.toThrow(
        'Target sequence 100 exceeds latest sequence 1',
      );
    });

    it('should throw error for targetSeq less than 1', async () => {
      const service = getSyncService();

      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: 'ADD',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 't1',
          payload: { title: 'Task 1' },
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      await expect(service.generateSnapshotAtSeq(userId, 0)).rejects.toThrow(
        'Target sequence must be at least 1',
      );
    });

    it('should correctly restore state from SYNC_IMPORT operation', async () => {
      const service = getSyncService();

      const importPayload = {
        globalConfig: { theme: 'dark' },
        tasks: {
          t1: { title: 'Imported Task', done: true },
        },
      };

      // Upload a SYNC_IMPORT (full state)
      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: '[SP_ALL] Load(import) all data',
          opType: 'SYNC_IMPORT',
          entityType: 'ALL',
          payload: importPayload,
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      // Add more operations after
      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: 'ADD',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 't2',
          payload: { title: 'New Task' },
          vectorClock: {},
          timestamp: Date.now() + 1,
          schemaVersion: 1,
        },
      ]);

      // Get snapshot at seq 1 (the SYNC_IMPORT)
      const snapshot = await service.generateSnapshotAtSeq(userId, 1);

      expect(snapshot.serverSeq).toBe(1);
      const state = snapshot.state as Record<string, unknown>;
      expect(state.globalConfig).toEqual({ theme: 'dark' });
      expect((state.tasks as Record<string, unknown>).t1).toEqual({
        title: 'Imported Task',
        done: true,
      });
      expect((state.TASK as Record<string, unknown> | undefined)?.t2).toBeUndefined();
    });

    it('should include generatedAt timestamp', async () => {
      const service = getSyncService();
      const beforeTime = Date.now();

      service.uploadOps(userId, clientId, [
        {
          id: uuidv7(),
          clientId,
          actionType: 'ADD',
          opType: 'CRT',
          entityType: 'TASK',
          entityId: 't1',
          payload: { title: 'Task 1' },
          vectorClock: {},
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ]);

      const snapshot = await service.generateSnapshotAtSeq(userId, 1);
      const afterTime = Date.now();

      expect(snapshot.generatedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(snapshot.generatedAt).toBeLessThanOrEqual(afterTime);
    });
  });
});

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
      expect(state.task).toBeDefined();
      expect(state.task.t1).toBeDefined();
      expect(state.task.t1.title).toBe('Task 1');
      expect(state.task.t1.done).toBe(true);
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
        (snap1.state as Record<string, Record<string, { text: string }>>).note.n1.text,
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
      expect(state.note.n1.text).toBe('Note 1'); // Preserved
      expect(state.note.n2.text).toBe('Note 2'); // Added
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

      expect(state.tag.tg1).toBeUndefined();
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

      expect(state.task.t1.parentId).toBe('p1');
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

      expect(state.task.t1.title).toBe('Task 1');
      expect(state.task.t2.done).toBe(true);
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

  describe('device acknowledgment', () => {
    it('should update device ack sequence', () => {
      const service = getSyncService();
      const db = getDb();

      // First upload to create device
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

      service.updateDeviceAck(userId, clientId, 5);

      const device = db
        .prepare(
          'SELECT last_acked_seq FROM sync_devices WHERE user_id = ? AND client_id = ?',
        )
        .get(userId, clientId) as { last_acked_seq: number };

      expect(device.last_acked_seq).toBe(5);
    });

    it('should return minimum acked sequence across all devices', () => {
      const service = getSyncService();

      // Create two devices by uploading ops
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

      // Device 1 acks seq 10, device 2 acks seq 5
      service.updateDeviceAck(userId, 'device-1', 10);
      service.updateDeviceAck(userId, 'device-2', 5);

      const minSeq = service.getMinAckedSeq(userId);

      expect(minSeq).toBe(5);
    });

    it('should return null when no devices exist', () => {
      const service = getSyncService();

      const minSeq = service.getMinAckedSeq(userId);

      expect(minSeq).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should delete old synced operations', () => {
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
      // The query uses server_seq < beforeSeq, so seq 1 and 2 will be deleted when beforeSeq=3
      db.prepare('UPDATE operations SET received_at = ? WHERE server_seq <= 2').run(
        Date.now() - 100 * 24 * 60 * 60 * 1000, // 100 days ago
      );

      // beforeSeq=3 means delete ops with server_seq < 3 (i.e., seq 1 and 2)
      const deleted = service.deleteOldSyncedOps(userId, 3, Date.now());

      expect(deleted).toBe(2);

      const remaining = service.getOpsSince(userId, 0);
      expect(remaining).toHaveLength(3);
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

      // Make device stale
      db.prepare('UPDATE sync_devices SET last_seen_at = ? WHERE client_id = ?').run(
        Date.now() - 100 * 24 * 60 * 60 * 1000, // 100 days ago
        clientId,
      );

      const deleted = service.deleteStaleDevices(Date.now() - 30 * 24 * 60 * 60 * 1000);

      expect(deleted).toBe(1);
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
});

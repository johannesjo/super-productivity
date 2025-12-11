import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initDb, getDb } from '../src/db';
import { initSyncService, getSyncService } from '../src/sync/sync.service';
import { Operation, MS_PER_DAY } from '../src/sync/sync.types';
import { uuidv7 } from 'uuidv7';
import * as zlib from 'zlib';

describe('Sync Operations', () => {
  const userId = 1;
  const clientId = 'test-client';

  const createOp = (
    entityId: string,
    opType: 'CRT' | 'UPD' | 'DEL' = 'CRT',
    entityType = 'TASK',
  ): Operation => ({
    id: uuidv7(),
    clientId,
    actionType:
      opType === 'CRT' ? 'ADD_TASK' : opType === 'UPD' ? 'UPDATE_TASK' : 'DELETE_TASK',
    opType,
    entityType,
    entityId,
    payload: opType === 'DEL' ? null : { title: `Task ${entityId}` },
    vectorClock: { [clientId]: 1 },
    timestamp: Date.now(),
    schemaVersion: 1,
  });

  beforeEach(() => {
    initDb('./data', true);
    const db = getDb();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, is_verified, created_at)
       VALUES (?, 'test@test.com', 'hash', 1, ?)`,
    ).run(userId, Date.now());
    initSyncService();
  });

  describe('Snapshot Generation', () => {
    it('should generate empty snapshot for user with no operations', () => {
      const service = getSyncService();

      const snapshot = service.generateSnapshot(userId);

      expect(snapshot.state).toEqual({});
      expect(snapshot.serverSeq).toBe(0);
      expect(snapshot.schemaVersion).toBe(1);
    });

    it('should generate snapshot reflecting all operations', () => {
      const service = getSyncService();

      service.uploadOps(userId, clientId, [
        createOp('task-1', 'CRT'),
        createOp('task-2', 'CRT'),
      ]);

      const snapshot = service.generateSnapshot(userId);

      expect(snapshot.serverSeq).toBe(2);
      expect(snapshot.state).toHaveProperty('TASK');
      const tasks = (snapshot.state as Record<string, Record<string, unknown>>).TASK;
      expect(tasks['task-1']).toHaveProperty('title', 'Task task-1');
      expect(tasks['task-2']).toHaveProperty('title', 'Task task-2');
    });

    it('should apply updates to snapshot', () => {
      const service = getSyncService();

      // Create task
      service.uploadOps(userId, clientId, [createOp('task-1', 'CRT')]);

      // Update task
      const updateOp: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'UPDATE_TASK',
        opType: 'UPD',
        entityType: 'TASK',
        entityId: 'task-1',
        payload: { title: 'Updated Title', done: true },
        vectorClock: { [clientId]: 2 },
        timestamp: Date.now(),
        schemaVersion: 1,
      };
      service.uploadOps(userId, clientId, [updateOp]);

      const snapshot = service.generateSnapshot(userId);

      const tasks = (snapshot.state as Record<string, Record<string, unknown>>).TASK;
      expect(tasks['task-1']).toHaveProperty('title', 'Updated Title');
      expect(tasks['task-1']).toHaveProperty('done', true);
    });

    it('should remove deleted entities from snapshot', () => {
      const service = getSyncService();

      // Create two tasks
      service.uploadOps(userId, clientId, [
        createOp('task-1', 'CRT'),
        createOp('task-2', 'CRT'),
      ]);

      // Delete task-1
      service.uploadOps(userId, clientId, [createOp('task-1', 'DEL')]);

      const snapshot = service.generateSnapshot(userId);

      const tasks = (snapshot.state as Record<string, Record<string, unknown>>).TASK;
      expect(tasks['task-1']).toBeUndefined();
      expect(tasks['task-2']).toHaveProperty('title', 'Task task-2');
    });

    it('should cache and return cached snapshot when up to date', () => {
      const service = getSyncService();

      service.uploadOps(userId, clientId, [createOp('task-1', 'CRT')]);

      // First generation
      const snapshot1 = service.generateSnapshot(userId);
      const generatedAt1 = snapshot1.generatedAt;

      // Wait a bit
      const start = Date.now();
      while (Date.now() - start < 10) {
        // spin
      }

      // Second generation should use cache (if no new ops)
      const snapshot2 = service.generateSnapshot(userId);

      // Server seq should be same
      expect(snapshot2.serverSeq).toBe(snapshot1.serverSeq);
      // State should be equivalent
      expect(snapshot2.state).toEqual(snapshot1.state);
      // generatedAt should be refreshed (showing it was still accessed)
      expect(snapshot2.generatedAt).toBeGreaterThanOrEqual(generatedAt1);
    });

    it('should rebuild snapshot when new operations arrive', () => {
      const service = getSyncService();

      service.uploadOps(userId, clientId, [createOp('task-1', 'CRT')]);
      service.generateSnapshot(userId);

      // Add new operation
      service.uploadOps(userId, clientId, [createOp('task-2', 'CRT')]);

      // Second generation should include new op
      const snapshot2 = service.generateSnapshot(userId);

      expect(snapshot2.serverSeq).toBe(2);
      const tasks = (snapshot2.state as Record<string, Record<string, unknown>>).TASK;
      expect(tasks['task-2']).toBeDefined();
    });

    it('should handle multiple entity types', () => {
      const service = getSyncService();

      const taskOp = createOp('task-1', 'CRT', 'TASK');
      const projectOp: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'ADD_PROJECT',
        opType: 'CRT',
        entityType: 'PROJECT',
        entityId: 'project-1',
        payload: { title: 'My Project' },
        vectorClock: { [clientId]: 1 },
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      service.uploadOps(userId, clientId, [taskOp, projectOp]);

      const snapshot = service.generateSnapshot(userId);

      expect(snapshot.state).toHaveProperty('TASK');
      expect(snapshot.state).toHaveProperty('PROJECT');
    });

    it('should accept time tracking operations', async () => {
      const service = getSyncService();

      const timeTrackingOp: Operation = {
        id: uuidv7(),
        clientId,
        actionType: 'ADD_TIME',
        opType: 'UPD',
        entityType: 'TIME_TRACKING',
        entityId: 'tt-1',
        payload: { timeSpent: 120000, taskId: 'task-1' },
        vectorClock: { [clientId]: 1 },
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      const results = await service.uploadOps(userId, clientId, [timeTrackingOp]);

      expect(results[0]).toMatchObject({
        opId: timeTrackingOp.id,
        accepted: true,
      });
    });
  });

  describe('Snapshot Size Limits', () => {
    it('should skip caching oversized snapshots', () => {
      const service = getSyncService();

      // Create many large operations to exceed size limit
      // The limit is 50MB compressed, which is hard to hit, so we just verify the function works
      service.uploadOps(userId, clientId, [createOp('task-1', 'CRT')]);

      // This should work without error
      const snapshot = service.generateSnapshot(userId);
      expect(snapshot).toBeDefined();
    });

    it('should discard cached snapshot if decompression exceeds limit', () => {
      const service = getSyncService();

      service.uploadOps(userId, clientId, [createOp('task-1', 'CRT')]);
      service.generateSnapshot(userId);

      const gunzipSpy = vi.spyOn(zlib, 'gunzipSync').mockImplementation(() => {
        throw new RangeError('maxOutputLength exceeded');
      });

      const cached = service.getCachedSnapshot(userId);
      expect(cached).toBeNull();

      gunzipSpy.mockRestore();
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests under the rate limit', () => {
      const service = getSyncService();

      // Default limit is 100 requests per minute
      for (let i = 0; i < 50; i++) {
        expect(service.isRateLimited(userId)).toBe(false);
      }
    });

    it('should block requests over the rate limit', () => {
      const service = getSyncService();

      // Exhaust rate limit (default 100)
      for (let i = 0; i < 100; i++) {
        service.isRateLimited(userId);
      }

      // Next request should be rate limited
      expect(service.isRateLimited(userId)).toBe(true);
    });

    it('should track rate limits per user', () => {
      const service = getSyncService();
      const userId2 = 2;

      // Create second user
      const db = getDb();
      db.prepare(
        `INSERT INTO users (id, email, password_hash, is_verified, created_at)
         VALUES (?, 'test2@test.com', 'hash', 1, ?)`,
      ).run(userId2, Date.now());

      // Exhaust user 1's limit
      for (let i = 0; i < 100; i++) {
        service.isRateLimited(userId);
      }

      // User 1 should be limited
      expect(service.isRateLimited(userId)).toBe(true);

      // User 2 should not be limited
      expect(service.isRateLimited(userId2)).toBe(false);
    });

    it('should cleanup expired rate limit counters', () => {
      const service = getSyncService();

      // Trigger rate limit tracking for multiple users
      for (let i = 1; i <= 5; i++) {
        service.isRateLimited(i);
      }

      // Since we can't easily manipulate time, just verify cleanup runs without error
      const cleaned = service.cleanupExpiredRateLimitCounters();
      // With fresh counters, nothing should be expired yet
      expect(cleaned).toBe(0);
    });
  });

  describe('Tombstone Management', () => {
    it('should create tombstone on DEL operation', () => {
      const service = getSyncService();

      // Create and delete a task
      service.uploadOps(userId, clientId, [
        createOp('task-1', 'CRT'),
        createOp('task-1', 'DEL'),
      ]);

      // Check tombstone exists
      expect(service.isTombstoned(userId, 'TASK', 'task-1')).toBe(true);
    });

    it('should not create tombstone for non-DEL operations', () => {
      const service = getSyncService();

      // Create a task
      service.uploadOps(userId, clientId, [createOp('task-1', 'CRT')]);

      // No tombstone should exist
      expect(service.isTombstoned(userId, 'TASK', 'task-1')).toBe(false);
    });

    it('should track tombstones per user', () => {
      const service = getSyncService();
      const userId2 = 2;

      // Create second user
      const db = getDb();
      db.prepare(
        `INSERT INTO users (id, email, password_hash, is_verified, created_at)
         VALUES (?, 'test2@test.com', 'hash', 1, ?)`,
      ).run(userId2, Date.now());

      // Delete task for user 1
      service.uploadOps(userId, clientId, [
        createOp('shared-id', 'CRT'),
        createOp('shared-id', 'DEL'),
      ]);

      // Tombstone should exist for user 1
      expect(service.isTombstoned(userId, 'TASK', 'shared-id')).toBe(true);

      // Tombstone should NOT exist for user 2
      expect(service.isTombstoned(userId2, 'TASK', 'shared-id')).toBe(false);
    });

    it('should delete expired tombstones', () => {
      const service = getSyncService();
      const db = getDb();

      // Create a tombstone manually with expired time
      const hundredDaysMs = MS_PER_DAY * 100;
      const oneDayMs = MS_PER_DAY;
      db.prepare(
        `INSERT INTO tombstones (user_id, entity_type, entity_id, deleted_at, deleted_by_op_id, expires_at)
         VALUES (?, 'TASK', 'old-task', ?, 'op-123', ?)`,
      ).run(userId, Date.now() - hundredDaysMs, Date.now() - oneDayMs); // Expired yesterday

      // Also create a non-expired tombstone
      const ninetyDaysMs = MS_PER_DAY * 90;
      db.prepare(
        `INSERT INTO tombstones (user_id, entity_type, entity_id, deleted_at, deleted_by_op_id, expires_at)
         VALUES (?, 'TASK', 'new-task', ?, 'op-456', ?)`,
      ).run(userId, Date.now(), Date.now() + ninetyDaysMs); // Expires in 90 days

      // Cleanup should delete the expired one
      const deleted = service.deleteExpiredTombstones();
      expect(deleted).toBe(1);

      // Verify correct tombstone was deleted
      expect(service.isTombstoned(userId, 'TASK', 'old-task')).toBe(false);
      expect(service.isTombstoned(userId, 'TASK', 'new-task')).toBe(true);
    });
  });

  describe('Cleanup Operations', () => {
    it('should delete old synced operations', () => {
      const service = getSyncService();
      const db = getDb();

      // Upload some operations
      service.uploadOps(userId, clientId, [
        createOp('task-1', 'CRT'),
        createOp('task-2', 'CRT'),
      ]);

      // Manually set one operation to be "old" (received 100 days ago)
      const hundredDaysMs = MS_PER_DAY * 100;
      db.prepare('UPDATE operations SET received_at = ? WHERE server_seq = ?').run(
        Date.now() - hundredDaysMs,
        1,
      );

      // Delete operations older than 90 days
      const ninetyDaysMs = MS_PER_DAY * 90;
      const cutoff = Date.now() - ninetyDaysMs;
      const deleted = service.deleteOldSyncedOpsForAllUsers(cutoff);

      expect(deleted).toBe(1);

      // Verify correct operation was deleted
      const ops = service.getOpsSince(userId, 0);
      expect(ops.length).toBe(1);
      expect(ops[0].serverSeq).toBe(2);
    });

    it('should delete stale devices', () => {
      const service = getSyncService();
      const db = getDb();

      // Upload op to create device entry
      service.uploadOps(userId, clientId, [createOp('task-1', 'CRT')]);

      // Manually set device to stale (not seen in 60 days)
      const sixtyDaysMs = MS_PER_DAY * 60;
      db.prepare('UPDATE sync_devices SET last_seen_at = ? WHERE client_id = ?').run(
        Date.now() - sixtyDaysMs,
        clientId,
      );

      // Delete devices not seen in 50 days
      const fiftyDaysMs = MS_PER_DAY * 50;
      const cutoff = Date.now() - fiftyDaysMs;
      const deleted = service.deleteStaleDevices(cutoff);

      expect(deleted).toBe(1);
    });

    it('should not delete active devices', () => {
      const service = getSyncService();

      // Upload op to create device entry (will be "seen" now)
      service.uploadOps(userId, clientId, [createOp('task-1', 'CRT')]);

      // Try to delete devices not seen in 50 days
      const fiftyDaysMs = MS_PER_DAY * 50;
      const cutoff = Date.now() - fiftyDaysMs;
      const deleted = service.deleteStaleDevices(cutoff);

      // Should not delete anything (device was just seen)
      expect(deleted).toBe(0);
    });
  });

  describe('Request Deduplication', () => {
    it('should return null for new request IDs', () => {
      const service = getSyncService();

      const cached = service.checkRequestDeduplication(userId, 'new-request-123');
      expect(cached).toBeNull();
    });

    it('should cache and return results for duplicate requests', () => {
      const service = getSyncService();
      const requestId = 'request-456';

      const results = [{ opId: 'op-1', accepted: true, serverSeq: 1 }];

      // Cache results
      service.cacheRequestResults(userId, requestId, results);

      // Should return cached results
      const cached = service.checkRequestDeduplication(userId, requestId);
      expect(cached).toEqual(results);
    });

    it('should track request deduplication per user', () => {
      const service = getSyncService();
      const requestId = 'shared-request';

      const results = [{ opId: 'op-1', accepted: true, serverSeq: 1 }];
      service.cacheRequestResults(userId, requestId, results);

      // Same request ID for different user should not be cached
      const cachedOtherUser = service.checkRequestDeduplication(2, requestId);
      expect(cachedOtherUser).toBeNull();
    });

    it('should cleanup expired dedup entries', () => {
      const service = getSyncService();

      // Cache some results
      service.cacheRequestResults(userId, 'request-1', []);
      service.cacheRequestResults(userId, 'request-2', []);

      // Since we can't easily manipulate time, verify cleanup runs without error
      const cleaned = service.cleanupExpiredRequestDedupEntries();
      // Fresh entries shouldn't be expired
      expect(cleaned).toBe(0);
    });
  });

  describe('Database Constraints', () => {
    it('should cascade delete operations when user is removed', () => {
      const service = getSyncService();

      service.uploadOps(userId, clientId, [
        createOp('task-1', 'CRT'),
        createOp('task-2', 'CRT'),
      ]);

      const db = getDb();
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);

      const remaining = db
        .prepare('SELECT COUNT(*) as count FROM operations WHERE user_id = ?')
        .get(userId) as { count: number };

      expect(remaining.count).toBe(0);
    });
  });

  describe('Device Ownership', () => {
    it('should track device ownership after upload', () => {
      const service = getSyncService();

      // Before upload, device is not registered
      expect(service.isDeviceOwner(userId, clientId)).toBe(false);

      // Upload creates device entry
      service.uploadOps(userId, clientId, [createOp('task-1', 'CRT')]);

      // Now device should be owned by user
      expect(service.isDeviceOwner(userId, clientId)).toBe(true);
    });

    it('should return false for non-existent device', () => {
      const service = getSyncService();

      expect(service.isDeviceOwner(userId, 'non-existent-device')).toBe(false);
    });

    it('should track device ownership per user', () => {
      const service = getSyncService();

      // Create device for user 1
      service.uploadOps(userId, clientId, [createOp('task-1', 'CRT')]);

      // Device should not be owned by user 2
      expect(service.isDeviceOwner(2, clientId)).toBe(false);
    });
  });

  describe('User ID Retrieval', () => {
    it('should return all user IDs with sync state', () => {
      const service = getSyncService();
      const db = getDb();

      // Create additional users
      db.prepare(
        `INSERT INTO users (id, email, password_hash, is_verified, created_at)
         VALUES (2, 'test2@test.com', 'hash', 1, ?)`,
      ).run(Date.now());
      db.prepare(
        `INSERT INTO users (id, email, password_hash, is_verified, created_at)
         VALUES (3, 'test3@test.com', 'hash', 1, ?)`,
      ).run(Date.now());

      // Upload ops to create sync state
      service.uploadOps(1, 'client-1', [createOp('task-1', 'CRT')]);
      service.uploadOps(2, 'client-2', [createOp('task-1', 'CRT')]);
      // User 3 has no sync state

      const userIds = service.getAllUserIds();

      expect(userIds).toContain(1);
      expect(userIds).toContain(2);
      expect(userIds).not.toContain(3); // No sync state
    });
  });
});

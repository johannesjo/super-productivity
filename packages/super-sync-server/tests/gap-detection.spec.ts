import { describe, it, expect, beforeEach } from 'vitest';
import { initDb, getDb } from '../src/db';
import { initSyncService, getSyncService } from '../src/sync/sync.service';
import { Operation, MS_PER_DAY } from '../src/sync/sync.types';
import { uuidv7 } from 'uuidv7';

describe('Gap Detection', () => {
  const userId = 1;
  const clientA = 'client-a';
  const clientB = 'client-b';

  const createOp = (clientId: string, entityId: string): Operation => ({
    id: uuidv7(),
    clientId,
    actionType: 'ADD_TASK',
    opType: 'CRT',
    entityType: 'TASK',
    entityId,
    payload: { title: 'Test' },
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

  describe('Basic Gap Detection', () => {
    it('should not detect gap on first sync (sinceSeq = 0)', () => {
      const service = getSyncService();

      // Upload some operations
      const ops = [createOp(clientA, 'task-1'), createOp(clientA, 'task-2')];
      service.uploadOps(userId, clientA, ops);

      // First sync from sinceSeq = 0 should never have a gap
      const result = service.getOpsSinceWithSeq(userId, 0);
      expect(result.gapDetected).toBe(false);
      expect(result.ops.length).toBe(2);
      expect(result.latestSeq).toBe(2);
    });

    it('should not detect gap when operations are continuous', () => {
      const service = getSyncService();

      // Upload 3 operations
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-1')]);
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-2')]);
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-3')]);

      // Client syncs from seq 1, should get ops 2 and 3 with no gap
      const result = service.getOpsSinceWithSeq(userId, 1);
      expect(result.gapDetected).toBe(false);
      expect(result.ops.length).toBe(2);
      expect(result.ops[0].serverSeq).toBe(2);
      expect(result.ops[1].serverSeq).toBe(3);
    });

    it('should detect gap when seq jump occurs due to purged operations', () => {
      const service = getSyncService();
      const db = getDb();

      // Upload operations
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-1')]);
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-2')]);
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-3')]);
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-4')]);

      // Delete seq 2 and 3 to create a gap in the middle
      db.prepare('DELETE FROM operations WHERE user_id = ? AND server_seq IN (2, 3)').run(
        userId,
      );

      // Client syncs from seq 1, expects seq 2 next but gets seq 4
      const result = service.getOpsSinceWithSeq(userId, 1);
      expect(result.gapDetected).toBe(true);
      expect(result.ops.length).toBe(1);
      expect(result.ops[0].serverSeq).toBe(4);
    });

    it('should detect gap when requested sinceSeq is older than retained operations', () => {
      const service = getSyncService();
      const db = getDb();

      // Upload operations
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-1')]);
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-2')]);
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-3')]);
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-4')]);

      // Delete first two operations (simulating retention cleanup)
      db.prepare('DELETE FROM operations WHERE user_id = ? AND server_seq <= ?').run(
        userId,
        2,
      );

      // Client syncs from seq 1, but minSeq is now 3
      const result = service.getOpsSinceWithSeq(userId, 1);
      expect(result.gapDetected).toBe(true);
      expect(result.ops.length).toBe(2); // seqs 3 and 4
      expect(result.ops[0].serverSeq).toBe(3);
    });
  });

  describe('excludeClient Parameter', () => {
    it('should exclude operations from specified client', () => {
      const service = getSyncService();

      // Client A uploads
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-1')]);
      // Client B uploads
      service.uploadOps(userId, clientB, [createOp(clientB, 'task-2')]);
      // Client A uploads again
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-3')]);

      // Client A syncs excluding own ops
      const result = service.getOpsSinceWithSeq(userId, 0, clientA);
      expect(result.ops.length).toBe(1);
      expect(result.ops[0].op.clientId).toBe(clientB);
      expect(result.ops[0].serverSeq).toBe(2);
    });

    it('should not flag gap when excluded client caused the seq jump', () => {
      const service = getSyncService();

      // Client A uploads op 1
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-1')]);
      // Client B uploads op 2
      service.uploadOps(userId, clientB, [createOp(clientB, 'task-2')]);
      // Client B uploads op 3
      service.uploadOps(userId, clientB, [createOp(clientB, 'task-3')]);

      // Client B syncs from seq 0 excluding own ops
      // Should only get op 1, but seq jump from 1 to 4 shouldn't be flagged as gap
      // because the missing ops (2, 3) are from the excluded client
      const result = service.getOpsSinceWithSeq(userId, 0, clientB);
      expect(result.ops.length).toBe(1);
      expect(result.ops[0].serverSeq).toBe(1);
      // Gap detection is disabled when excludeClient is specified
      expect(result.gapDetected).toBe(false);
    });

    it('should detect gap via minSeq check even with excludeClient', () => {
      const service = getSyncService();
      const db = getDb();

      // Upload ops from both clients
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-1')]);
      service.uploadOps(userId, clientB, [createOp(clientB, 'task-2')]);
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-3')]);
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-4')]);

      // Delete ops 1 and 2
      db.prepare('DELETE FROM operations WHERE user_id = ? AND server_seq <= ?').run(
        userId,
        2,
      );

      // Client B syncs from seq 1, excluding own ops
      // sinceSeq=1, minSeq=3, so 1 < 3-1=2 is true -> gap detected
      const result = service.getOpsSinceWithSeq(userId, 1, clientB);
      expect(result.gapDetected).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty database gracefully', () => {
      const service = getSyncService();

      // No operations uploaded yet
      const result = service.getOpsSinceWithSeq(userId, 0);
      expect(result.gapDetected).toBe(false);
      expect(result.ops.length).toBe(0);
      expect(result.latestSeq).toBe(0);
    });

    it('should handle client ahead of server', () => {
      const service = getSyncService();

      // Upload one op
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-1')]);

      // Client claims to be at seq 100 (impossible)
      const result = service.getOpsSinceWithSeq(userId, 100);
      expect(result.gapDetected).toBe(false); // No gap because no ops after seq 100
      expect(result.ops.length).toBe(0);
      expect(result.latestSeq).toBe(1);
    });

    it('should respect limit parameter', () => {
      const service = getSyncService();

      // Upload 10 operations
      for (let i = 1; i <= 10; i++) {
        service.uploadOps(userId, clientA, [createOp(clientA, `task-${i}`)]);
      }

      // Request with limit 3
      const result = service.getOpsSinceWithSeq(userId, 0, undefined, 3);
      expect(result.ops.length).toBe(3);
      expect(result.ops[0].serverSeq).toBe(1);
      expect(result.ops[2].serverSeq).toBe(3);
      expect(result.latestSeq).toBe(10);
      expect(result.gapDetected).toBe(false);
    });

    it('should not detect gap when sinceSeq = 0 (first sync)', () => {
      const service = getSyncService();
      const db = getDb();

      // Upload and delete to create gap at seq 1
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-1')]);
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-2')]);
      db.prepare('DELETE FROM operations WHERE user_id = ? AND server_seq = ?').run(
        userId,
        1,
      );

      // sinceSeq = 0 skips gap detection entirely (first sync case)
      // The logic is: if (sinceSeq > 0 && latestSeq > 0) { ... }
      const result = service.getOpsSinceWithSeq(userId, 0);
      expect(result.gapDetected).toBe(false);
      expect(result.ops.length).toBe(1);
      expect(result.ops[0].serverSeq).toBe(2);
    });

    it('should handle single operation in database', () => {
      const service = getSyncService();

      service.uploadOps(userId, clientA, [createOp(clientA, 'task-1')]);

      // Sync from 0
      const result0 = service.getOpsSinceWithSeq(userId, 0);
      expect(result0.gapDetected).toBe(false);
      expect(result0.ops.length).toBe(1);

      // Sync from 1 (should get nothing, no gap)
      const result1 = service.getOpsSinceWithSeq(userId, 1);
      expect(result1.gapDetected).toBe(false);
      expect(result1.ops.length).toBe(0);
    });
  });

  describe('Transaction Isolation', () => {
    it('should return consistent latestSeq with returned operations', () => {
      const service = getSyncService();

      // Upload some operations
      for (let i = 1; i <= 5; i++) {
        service.uploadOps(userId, clientA, [createOp(clientA, `task-${i}`)]);
      }

      // The returned latestSeq should reflect the actual state at query time
      const result = service.getOpsSinceWithSeq(userId, 0);
      expect(result.latestSeq).toBe(5);
      expect(result.ops.length).toBe(5);

      // If we had 5 ops and latestSeq is 5, the last op should have serverSeq 5
      expect(result.ops[4].serverSeq).toBe(5);
    });
  });

  describe('User Isolation', () => {
    it('should only consider operations from requesting user', () => {
      const service = getSyncService();
      const db = getDb();
      const userId2 = 2;

      // Create second user
      db.prepare(
        `INSERT INTO users (id, email, password_hash, is_verified, created_at)
         VALUES (?, 'test2@test.com', 'hash', 1, ?)`,
      ).run(userId2, Date.now());

      // User 1 uploads
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-1')]);
      service.uploadOps(userId, clientA, [createOp(clientA, 'task-2')]);

      // User 2 uploads
      service.uploadOps(userId2, clientB, [createOp(clientB, 'task-1')]);

      // User 2's first sync should have no gap
      const result = service.getOpsSinceWithSeq(userId2, 0);
      expect(result.gapDetected).toBe(false);
      expect(result.ops.length).toBe(1);
      expect(result.latestSeq).toBe(1); // User 2 has seq 1 only
    });
  });

  describe('Gap Detection with minSeq', () => {
    it('should correctly calculate minSeq after cleanup', () => {
      const service = getSyncService();
      const db = getDb();

      // Upload 5 operations
      for (let i = 1; i <= 5; i++) {
        service.uploadOps(userId, clientA, [createOp(clientA, `task-${i}`)]);
      }

      // Delete first 3 operations
      db.prepare('DELETE FROM operations WHERE user_id = ? AND server_seq <= ?').run(
        userId,
        3,
      );

      // Now minSeq should be 4
      // Client requesting from seq 2 should detect gap
      const result = service.getOpsSinceWithSeq(userId, 2);
      expect(result.gapDetected).toBe(true);

      // Client requesting from seq 3 should also detect gap (3 < 4 - 1 = 3 is false, but first op is 4 not 4)
      const result2 = service.getOpsSinceWithSeq(userId, 3);
      // sinceSeq=3, minSeq=4, 3 < 4-1=3 is false, so no gap from minSeq
      // But first op is seq 4, which is 3+1=4, so no gap from first op check either
      expect(result2.gapDetected).toBe(false);
      expect(result2.ops[0].serverSeq).toBe(4);
    });
  });
});

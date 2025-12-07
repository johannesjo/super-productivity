import { describe, it, expect, beforeEach } from 'vitest';
import { initDb, getDb } from '../src/db';
import { initSyncService, getSyncService } from '../src/sync/sync.service';
import { Operation, SYNC_ERROR_CODES, VectorClock } from '../src/sync/sync.types';
import { uuidv7 } from 'uuidv7';

describe('Conflict Detection', () => {
  const userId = 1;
  const clientA = 'client-a';
  const clientB = 'client-b';

  const createOp = (overrides: Partial<Operation> & { entityId: string }): Operation => ({
    id: uuidv7(),
    clientId: clientA,
    actionType: 'UPDATE_TASK',
    opType: 'UPD',
    entityType: 'TASK',
    payload: { title: 'Updated' },
    vectorClock: {},
    timestamp: Date.now(),
    schemaVersion: 1,
    ...overrides,
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

  describe('Vector Clock Comparison', () => {
    it('should accept operation when incoming clock is GREATER_THAN existing', () => {
      const service = getSyncService();
      const entityId = 'task-1';

      // First op from client A with clock {a: 1}
      const op1 = createOp({
        entityId,
        clientId: clientA,
        vectorClock: { [clientA]: 1 },
        opType: 'CRT',
      });
      const result1 = service.uploadOps(userId, clientA, [op1]);
      expect(result1[0].accepted).toBe(true);

      // Second op from client A with clock {a: 2} - GREATER_THAN {a: 1}
      const op2 = createOp({
        entityId,
        clientId: clientA,
        vectorClock: { [clientA]: 2 },
      });
      const result2 = service.uploadOps(userId, clientA, [op2]);
      expect(result2[0].accepted).toBe(true);
    });

    it('should reject operation when incoming clock is LESS_THAN existing (stale)', () => {
      const service = getSyncService();
      const entityId = 'task-1';

      // First op with clock {a: 2}
      const op1 = createOp({
        entityId,
        clientId: clientA,
        vectorClock: { [clientA]: 2 },
        opType: 'CRT',
      });
      const result1 = service.uploadOps(userId, clientA, [op1]);
      expect(result1[0].accepted).toBe(true);

      // Second op with clock {a: 1} - LESS_THAN {a: 2} (stale)
      const op2 = createOp({
        entityId,
        clientId: clientB,
        vectorClock: { [clientA]: 1 },
      });
      const result2 = service.uploadOps(userId, clientB, [op2]);
      expect(result2[0].accepted).toBe(false);
      expect(result2[0].errorCode).toBe(SYNC_ERROR_CODES.CONFLICT_STALE);
      expect(result2[0].error).toContain('Stale operation');
    });

    it('should reject operation when clocks are CONCURRENT', () => {
      const service = getSyncService();
      const entityId = 'task-1';

      // First op from client A with clock {a: 1}
      const op1 = createOp({
        entityId,
        clientId: clientA,
        vectorClock: { [clientA]: 1 },
        opType: 'CRT',
      });
      const result1 = service.uploadOps(userId, clientA, [op1]);
      expect(result1[0].accepted).toBe(true);

      // Second op from client B with clock {b: 1} - CONCURRENT with {a: 1}
      const op2 = createOp({
        entityId,
        clientId: clientB,
        vectorClock: { [clientB]: 1 },
      });
      const result2 = service.uploadOps(userId, clientB, [op2]);
      expect(result2[0].accepted).toBe(false);
      expect(result2[0].errorCode).toBe(SYNC_ERROR_CODES.CONFLICT_CONCURRENT);
      expect(result2[0].error).toContain('Concurrent modification');
    });

    it('should accept operation when clocks are EQUAL from same client (retry)', () => {
      const service = getSyncService();
      const entityId = 'task-1';

      // First op
      const op1 = createOp({
        entityId,
        clientId: clientA,
        vectorClock: { [clientA]: 1 },
        opType: 'CRT',
      });
      const result1 = service.uploadOps(userId, clientA, [op1]);
      expect(result1[0].accepted).toBe(true);

      // Second op with EQUAL clock from SAME client
      // Note: Different op ID, but same entity with same clock
      const op2 = createOp({
        entityId,
        clientId: clientA,
        vectorClock: { [clientA]: 1 },
      });
      const result2 = service.uploadOps(userId, clientA, [op2]);
      expect(result2[0].accepted).toBe(true);
    });

    it('should accept operation when clocks are EQUAL from different client', () => {
      const service = getSyncService();
      const entityId = 'task-1';

      // First op from client A
      const op1 = createOp({
        entityId,
        clientId: clientA,
        vectorClock: { [clientA]: 1 },
        opType: 'CRT',
      });
      const result1 = service.uploadOps(userId, clientA, [op1]);
      expect(result1[0].accepted).toBe(true);

      // Second op from client B with EQUAL clock
      // EQUAL clocks are accepted - both operations are at the same logical time
      // This is valid because they represent concurrent but identical knowledge
      const op2 = createOp({
        entityId,
        clientId: clientB,
        vectorClock: { [clientA]: 1 },
      });
      const result2 = service.uploadOps(userId, clientB, [op2]);
      expect(result2[0].accepted).toBe(true);
    });
  });

  describe('Conflict Bypass Rules', () => {
    it('should bypass conflict detection for SYNC_IMPORT operations', () => {
      const service = getSyncService();
      const entityId = 'task-1';

      // First op
      const op1 = createOp({
        entityId,
        clientId: clientA,
        vectorClock: { [clientA]: 1 },
        opType: 'CRT',
      });
      service.uploadOps(userId, clientA, [op1]);

      // SYNC_IMPORT with stale clock should still be accepted
      const op2 = createOp({
        entityId,
        clientId: clientB,
        vectorClock: {}, // Empty/stale clock
        opType: 'SYNC_IMPORT',
        entityType: 'ALL',
      });
      const result = service.uploadOps(userId, clientB, [op2]);
      expect(result[0].accepted).toBe(true);
    });

    it('should bypass conflict detection for BACKUP_IMPORT operations', () => {
      const service = getSyncService();
      const entityId = 'task-1';

      // First op
      const op1 = createOp({
        entityId,
        clientId: clientA,
        vectorClock: { [clientA]: 1 },
        opType: 'CRT',
      });
      service.uploadOps(userId, clientA, [op1]);

      // BACKUP_IMPORT with conflicting clock should still be accepted
      const op2 = createOp({
        entityId,
        clientId: clientB,
        vectorClock: { [clientB]: 1 }, // Concurrent clock
        opType: 'BACKUP_IMPORT',
        entityType: 'ALL',
      });
      const result = service.uploadOps(userId, clientB, [op2]);
      expect(result[0].accepted).toBe(true);
    });

    it('should bypass conflict detection for REPAIR operations', () => {
      const service = getSyncService();
      const entityId = 'task-1';

      // First op
      const op1 = createOp({
        entityId,
        clientId: clientA,
        vectorClock: { [clientA]: 1 },
        opType: 'CRT',
      });
      service.uploadOps(userId, clientA, [op1]);

      // REPAIR with stale clock should still be accepted
      const op2 = createOp({
        entityId,
        clientId: clientB,
        vectorClock: {}, // Empty clock
        opType: 'REPAIR',
        entityType: 'RECOVERY',
      });
      const result = service.uploadOps(userId, clientB, [op2]);
      expect(result[0].accepted).toBe(true);
    });

    it('should skip conflict detection when operation has no entityId', () => {
      const service = getSyncService();

      // First op on specific entity
      const op1 = createOp({
        entityId: 'task-1',
        clientId: clientA,
        vectorClock: { [clientA]: 1 },
        opType: 'CRT',
      });
      service.uploadOps(userId, clientA, [op1]);

      // Op without entityId (batch operation) should bypass conflict detection
      const op2: Operation = {
        id: uuidv7(),
        clientId: clientB,
        actionType: 'BATCH_UPDATE',
        opType: 'BATCH',
        entityType: 'TASK',
        // No entityId
        payload: { entities: {} },
        vectorClock: { [clientB]: 1 }, // Would be concurrent
        timestamp: Date.now(),
        schemaVersion: 1,
      };
      const result = service.uploadOps(userId, clientB, [op2]);
      expect(result[0].accepted).toBe(true);
    });
  });

  describe('Complex Vector Clock Scenarios', () => {
    it('should handle multi-device clock progression correctly', () => {
      const service = getSyncService();
      const entityId = 'task-1';
      const clientC = 'client-c';

      // Client A creates with {a: 1}
      const op1 = createOp({
        entityId,
        clientId: clientA,
        vectorClock: { [clientA]: 1 },
        opType: 'CRT',
      });
      expect(service.uploadOps(userId, clientA, [op1])[0].accepted).toBe(true);

      // Client B updates knowing A's change: {a: 1, b: 1}
      const op2 = createOp({
        entityId,
        clientId: clientB,
        vectorClock: { [clientA]: 1, [clientB]: 1 },
      });
      expect(service.uploadOps(userId, clientB, [op2])[0].accepted).toBe(true);

      // Client C updates knowing both: {a: 1, b: 1, c: 1}
      const op3 = createOp({
        entityId,
        clientId: clientC,
        vectorClock: { [clientA]: 1, [clientB]: 1, [clientC]: 1 },
      });
      expect(service.uploadOps(userId, clientC, [op3])[0].accepted).toBe(true);

      // Client A tries to update with stale clock {a: 2} (doesn't know about B, C)
      const op4 = createOp({
        entityId,
        clientId: clientA,
        vectorClock: { [clientA]: 2 },
      });
      const result = service.uploadOps(userId, clientA, [op4]);
      expect(result[0].accepted).toBe(false);
      expect(result[0].errorCode).toBe(SYNC_ERROR_CODES.CONFLICT_CONCURRENT);
    });

    it('should handle rapid sequential updates from same client', () => {
      const service = getSyncService();
      const entityId = 'task-1';

      // Sequential updates from same client should all succeed
      for (let i = 1; i <= 10; i++) {
        const op = createOp({
          entityId,
          clientId: clientA,
          vectorClock: { [clientA]: i },
          opType: i === 1 ? 'CRT' : 'UPD',
        });
        const result = service.uploadOps(userId, clientA, [op]);
        expect(result[0].accepted).toBe(true);
        expect(result[0].serverSeq).toBe(i);
      }
    });

    it('should detect conflict for deleted entity being updated', () => {
      const service = getSyncService();
      const entityId = 'task-1';

      // Create
      const op1 = createOp({
        entityId,
        clientId: clientA,
        vectorClock: { [clientA]: 1 },
        opType: 'CRT',
      });
      service.uploadOps(userId, clientA, [op1]);

      // Delete
      const op2 = createOp({
        entityId,
        clientId: clientA,
        vectorClock: { [clientA]: 2 },
        opType: 'DEL',
        payload: null,
      });
      service.uploadOps(userId, clientA, [op2]);

      // Client B tries to update with concurrent clock (doesn't know about delete)
      const op3 = createOp({
        entityId,
        clientId: clientB,
        vectorClock: { [clientA]: 1, [clientB]: 1 },
      });
      const result = service.uploadOps(userId, clientB, [op3]);
      expect(result[0].accepted).toBe(false);
      expect(result[0].errorCode).toBe(SYNC_ERROR_CODES.CONFLICT_CONCURRENT);
    });
  });

  describe('Entity Type Isolation', () => {
    it('should not conflict operations on different entities of same type', () => {
      const service = getSyncService();

      // Op on task-1
      const op1 = createOp({
        entityId: 'task-1',
        clientId: clientA,
        vectorClock: { [clientA]: 1 },
        opType: 'CRT',
      });
      service.uploadOps(userId, clientA, [op1]);

      // Op on task-2 with same clock should succeed (different entity)
      const op2 = createOp({
        entityId: 'task-2',
        clientId: clientB,
        vectorClock: { [clientA]: 1 }, // Same clock, but different entity
        opType: 'CRT',
      });
      const result = service.uploadOps(userId, clientB, [op2]);
      expect(result[0].accepted).toBe(true);
    });

    it('should not conflict operations on different entity types with same ID', () => {
      const service = getSyncService();
      const entityId = 'entity-1';

      // Create a TASK with this ID
      const op1 = createOp({
        entityId,
        entityType: 'TASK',
        clientId: clientA,
        vectorClock: { [clientA]: 1 },
        opType: 'CRT',
      });
      service.uploadOps(userId, clientA, [op1]);

      // Create a PROJECT with same ID and concurrent clock should succeed
      const op2 = createOp({
        entityId,
        entityType: 'PROJECT',
        clientId: clientB,
        vectorClock: { [clientB]: 1 }, // Would be concurrent for same entity
        opType: 'CRT',
      });
      const result = service.uploadOps(userId, clientB, [op2]);
      expect(result[0].accepted).toBe(true);
    });
  });

  describe('User Isolation', () => {
    it('should not conflict operations from different users', () => {
      const service = getSyncService();
      const entityId = 'task-1';
      const userId2 = 2;

      // Create second user
      const db = getDb();
      db.prepare(
        `INSERT INTO users (id, email, password_hash, is_verified, created_at)
         VALUES (?, 'test2@test.com', 'hash', 1, ?)`,
      ).run(userId2, Date.now());

      // User 1 creates task
      const op1 = createOp({
        entityId,
        clientId: clientA,
        vectorClock: { [clientA]: 1 },
        opType: 'CRT',
      });
      service.uploadOps(userId, clientA, [op1]);

      // User 2 creates task with same ID - should succeed (different user)
      const op2 = createOp({
        entityId,
        clientId: clientB,
        vectorClock: { [clientB]: 1 },
        opType: 'CRT',
      });
      const result = service.uploadOps(userId2, clientB, [op2]);
      expect(result[0].accepted).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty vector clocks gracefully', () => {
      const service = getSyncService();
      const entityId = 'task-1';

      // First op with empty clock
      const op1 = createOp({
        entityId,
        clientId: clientA,
        vectorClock: {},
        opType: 'CRT',
      });
      const result1 = service.uploadOps(userId, clientA, [op1]);
      expect(result1[0].accepted).toBe(true);

      // Second op with empty clock from different client
      // Empty clocks are EQUAL - both accepted (same logical time)
      const op2 = createOp({
        entityId,
        clientId: clientB,
        vectorClock: {},
      });
      const result2 = service.uploadOps(userId, clientB, [op2]);
      expect(result2[0].accepted).toBe(true);
    });

    it('should handle very large vector clocks', () => {
      const service = getSyncService();
      const entityId = 'task-1';

      // Create clock with many entries (under the 100 limit)
      const largeClock: VectorClock = {};
      for (let i = 0; i < 50; i++) {
        largeClock[`client-${i}`] = i + 1;
      }

      const op1 = createOp({
        entityId,
        clientId: clientA,
        vectorClock: largeClock,
        opType: 'CRT',
      });
      const result = service.uploadOps(userId, clientA, [op1]);
      expect(result[0].accepted).toBe(true);

      // Verify the clock was stored correctly
      const ops = service.getOpsSince(userId, 0);
      expect(ops[0].op.vectorClock).toEqual(largeClock);
    });

    it('should handle first operation on entity (no existing op to conflict with)', () => {
      const service = getSyncService();

      // First ever operation - no conflict possible
      const op = createOp({
        entityId: 'brand-new-task',
        clientId: clientA,
        vectorClock: { [clientA]: 1 },
        opType: 'CRT',
      });
      const result = service.uploadOps(userId, clientA, [op]);
      expect(result[0].accepted).toBe(true);
    });
  });
});

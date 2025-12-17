/**
 * Tests for the Snapshot Skip Optimization
 *
 * When downloading operations, the server should skip operations that precede
 * the latest full-state operation (SYNC_IMPORT, BACKUP_IMPORT, REPAIR).
 * This reduces bandwidth and processing time for fresh clients.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncService } from '../src/sync/sync.service';

// Mock Prisma
vi.mock('../src/db', () => ({
  prisma: {
    $transaction: vi.fn(),
    userSyncState: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    operation: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
    },
    syncDevice: {
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from '../src/db';

describe('Snapshot Skip Optimization', () => {
  let service: SyncService;
  const userId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SyncService();
  });

  describe('getOpsSinceWithSeq', () => {
    it('should return latestSnapshotSeq when SYNC_IMPORT exists', async () => {
      // Setup transaction mock
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          operation: {
            findFirst: vi.fn().mockResolvedValue({ serverSeq: 10 }), // SYNC_IMPORT at seq 10
            findMany: vi.fn().mockResolvedValue([
              {
                id: 'op-10',
                serverSeq: 10,
                clientId: 'client-a',
                actionType: '[SP_ALL] Load(import) all data',
                opType: 'SYNC_IMPORT',
                entityType: 'ALL',
                entityId: null,
                payload: {},
                vectorClock: {},
                schemaVersion: 1,
                clientTimestamp: BigInt(Date.now()),
                receivedAt: BigInt(Date.now()),
                parentOpId: null,
                isPayloadEncrypted: false,
              },
              {
                id: 'op-11',
                serverSeq: 11,
                clientId: 'client-a',
                actionType: 'ADD_TASK',
                opType: 'CRT',
                entityType: 'TASK',
                entityId: 'task-1',
                payload: { title: 'Task 1' },
                vectorClock: {},
                schemaVersion: 1,
                clientTimestamp: BigInt(Date.now()),
                receivedAt: BigInt(Date.now()),
                parentOpId: null,
                isPayloadEncrypted: false,
              },
            ]),
            aggregate: vi.fn().mockResolvedValue({ _min: { serverSeq: 1 } }),
          },
          userSyncState: {
            findUnique: vi.fn().mockResolvedValue({ lastSeq: 11 }),
          },
        };
        return callback(tx);
      });

      const result = await service.getOpsSinceWithSeq(userId, 0);

      expect(result.latestSnapshotSeq).toBe(10);
      expect(result.latestSeq).toBe(11);
      expect(result.gapDetected).toBe(false);
    });

    it('should skip operations before SYNC_IMPORT when sinceSeq is 0', async () => {
      const syncImportSeq = 50;

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          operation: {
            findFirst: vi.fn().mockResolvedValue({ serverSeq: syncImportSeq }),
            findMany: vi.fn().mockImplementation(async (args: any) => {
              // Verify that the query starts from syncImportSeq - 1, not 0
              expect(args.where.serverSeq.gt).toBe(syncImportSeq - 1);
              return [
                {
                  id: 'op-50',
                  serverSeq: 50,
                  clientId: 'client-a',
                  actionType: '[SP_ALL] Load(import) all data',
                  opType: 'SYNC_IMPORT',
                  entityType: 'ALL',
                  entityId: null,
                  payload: {},
                  vectorClock: {},
                  schemaVersion: 1,
                  clientTimestamp: BigInt(Date.now()),
                  receivedAt: BigInt(Date.now()),
                  parentOpId: null,
                  isPayloadEncrypted: false,
                },
              ];
            }),
            aggregate: vi.fn().mockResolvedValue({ _min: { serverSeq: 1 } }),
          },
          userSyncState: {
            findUnique: vi.fn().mockResolvedValue({ lastSeq: 50 }),
          },
        };
        return callback(tx);
      });

      const result = await service.getOpsSinceWithSeq(userId, 0);

      // Should only return ops from seq 50 onwards, not from seq 1
      expect(result.ops.length).toBe(1);
      expect(result.ops[0].serverSeq).toBe(50);
      expect(result.latestSnapshotSeq).toBe(50);
    });

    it('should NOT skip when sinceSeq is after SYNC_IMPORT', async () => {
      const syncImportSeq = 10;

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          operation: {
            findFirst: vi.fn().mockResolvedValue({ serverSeq: syncImportSeq }),
            findMany: vi.fn().mockImplementation(async (args: any) => {
              // When sinceSeq (15) > syncImportSeq (10), should NOT modify the query
              expect(args.where.serverSeq.gt).toBe(15);
              return [
                {
                  id: 'op-16',
                  serverSeq: 16,
                  clientId: 'client-a',
                  actionType: 'ADD_TASK',
                  opType: 'CRT',
                  entityType: 'TASK',
                  entityId: 'task-1',
                  payload: {},
                  vectorClock: {},
                  schemaVersion: 1,
                  clientTimestamp: BigInt(Date.now()),
                  receivedAt: BigInt(Date.now()),
                  parentOpId: null,
                  isPayloadEncrypted: false,
                },
              ];
            }),
            aggregate: vi.fn().mockResolvedValue({ _min: { serverSeq: 1 } }),
          },
          userSyncState: {
            findUnique: vi.fn().mockResolvedValue({ lastSeq: 20 }),
          },
        };
        return callback(tx);
      });

      const result = await service.getOpsSinceWithSeq(userId, 15);

      expect(result.ops.length).toBe(1);
      expect(result.ops[0].serverSeq).toBe(16);
      expect(result.latestSnapshotSeq).toBe(10);
    });

    it('should return undefined latestSnapshotSeq when no full-state ops exist', async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          operation: {
            findFirst: vi.fn().mockResolvedValue(null), // No SYNC_IMPORT found
            findMany: vi.fn().mockResolvedValue([
              {
                id: 'op-1',
                serverSeq: 1,
                clientId: 'client-a',
                actionType: 'ADD_TASK',
                opType: 'CRT',
                entityType: 'TASK',
                entityId: 'task-1',
                payload: {},
                vectorClock: {},
                schemaVersion: 1,
                clientTimestamp: BigInt(Date.now()),
                receivedAt: BigInt(Date.now()),
                parentOpId: null,
                isPayloadEncrypted: false,
              },
            ]),
            aggregate: vi.fn().mockResolvedValue({ _min: { serverSeq: 1 } }),
          },
          userSyncState: {
            findUnique: vi.fn().mockResolvedValue({ lastSeq: 1 }),
          },
        };
        return callback(tx);
      });

      const result = await service.getOpsSinceWithSeq(userId, 0);

      expect(result.latestSnapshotSeq).toBeUndefined();
      expect(result.ops.length).toBe(1);
    });

    it('should handle BACKUP_IMPORT as a full-state operation', async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          operation: {
            findFirst: vi.fn().mockResolvedValue({ serverSeq: 5 }), // BACKUP_IMPORT at seq 5
            findMany: vi.fn().mockResolvedValue([
              {
                id: 'op-5',
                serverSeq: 5,
                clientId: 'client-a',
                actionType: '[SP_ALL] Load(import) all data',
                opType: 'BACKUP_IMPORT',
                entityType: 'ALL',
                entityId: null,
                payload: {},
                vectorClock: {},
                schemaVersion: 1,
                clientTimestamp: BigInt(Date.now()),
                receivedAt: BigInt(Date.now()),
                parentOpId: null,
                isPayloadEncrypted: false,
              },
            ]),
            aggregate: vi.fn().mockResolvedValue({ _min: { serverSeq: 1 } }),
          },
          userSyncState: {
            findUnique: vi.fn().mockResolvedValue({ lastSeq: 5 }),
          },
        };
        return callback(tx);
      });

      const result = await service.getOpsSinceWithSeq(userId, 0);

      expect(result.latestSnapshotSeq).toBe(5);
    });

    it('should handle REPAIR as a full-state operation', async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          operation: {
            findFirst: vi.fn().mockResolvedValue({ serverSeq: 20 }), // REPAIR at seq 20
            findMany: vi.fn().mockResolvedValue([
              {
                id: 'op-20',
                serverSeq: 20,
                clientId: 'client-a',
                actionType: '[SP_ALL] Load(import) all data',
                opType: 'REPAIR',
                entityType: 'ALL',
                entityId: null,
                payload: {},
                vectorClock: {},
                schemaVersion: 1,
                clientTimestamp: BigInt(Date.now()),
                receivedAt: BigInt(Date.now()),
                parentOpId: null,
                isPayloadEncrypted: false,
              },
            ]),
            aggregate: vi.fn().mockResolvedValue({ _min: { serverSeq: 1 } }),
          },
          userSyncState: {
            findUnique: vi.fn().mockResolvedValue({ lastSeq: 20 }),
          },
        };
        return callback(tx);
      });

      const result = await service.getOpsSinceWithSeq(userId, 0);

      expect(result.latestSnapshotSeq).toBe(20);
    });
  });
});

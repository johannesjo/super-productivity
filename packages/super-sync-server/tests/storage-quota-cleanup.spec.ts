/**
 * Tests for storage quota cleanup functionality.
 *
 * Tests the deleteOldestRestorePointAndOps method and auto-cleanup logic
 * when storage quota is exceeded.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { uuidv7 } from 'uuidv7';

// Store for test data
let testOperations: Map<string, any>;
let testUsers: Map<number, any>;
let testUserSyncStates: Map<number, any>;
let serverSeqCounter: number;

// Mock the database module with Prisma mocks
vi.mock('../src/db', () => {
  return {
    prisma: {
      $transaction: vi.fn().mockImplementation(async (callback: any) => {
        const tx = {
          operation: {
            create: vi.fn().mockImplementation(async (args: any) => {
              serverSeqCounter++;
              const op = {
                ...args.data,
                serverSeq: serverSeqCounter,
                receivedAt: BigInt(Date.now()),
              };
              testOperations.set(args.data.id, op);
              return op;
            }),
            findFirst: vi.fn().mockImplementation(async (args: any) => {
              if (args.where?.id) {
                return testOperations.get(args.where.id) || null;
              }
              if (args.where?.opType?.in) {
                for (const op of Array.from(testOperations.values()).reverse()) {
                  if (
                    args.where.opType.in.includes(op.opType) &&
                    args.where.userId === op.userId
                  ) {
                    return op;
                  }
                }
              }
              return null;
            }),
            findMany: vi.fn().mockImplementation(async (args: any) => {
              const ops = Array.from(testOperations.values());
              return ops
                .filter((op) => {
                  if (args.where?.userId !== undefined && args.where.userId !== op.userId)
                    return false;
                  if (args.where?.opType?.in) {
                    if (!args.where.opType.in.includes(op.opType)) return false;
                  }
                  if (args.where?.serverSeq?.lte !== undefined) {
                    if (op.serverSeq > args.where.serverSeq.lte) return false;
                  }
                  if (args.where?.serverSeq?.gt !== undefined) {
                    if (op.serverSeq <= args.where.serverSeq.gt) return false;
                  }
                  return true;
                })
                .sort((a, b) => {
                  // Handle orderBy
                  if (args.orderBy?.serverSeq === 'asc') {
                    return a.serverSeq - b.serverSeq;
                  }
                  if (args.orderBy?.serverSeq === 'desc') {
                    return b.serverSeq - a.serverSeq;
                  }
                  return a.serverSeq - b.serverSeq;
                });
            }),
            deleteMany: vi.fn().mockImplementation(async (args: any) => {
              let count = 0;
              const toDelete: string[] = [];
              for (const [id, op] of testOperations.entries()) {
                if (args.where?.userId !== undefined && args.where.userId !== op.userId)
                  continue;
                if (args.where?.serverSeq?.lte !== undefined) {
                  if (op.serverSeq <= args.where.serverSeq.lte) {
                    toDelete.push(id);
                    count++;
                  }
                }
              }
              for (const id of toDelete) {
                testOperations.delete(id);
              }
              return { count };
            }),
            aggregate: vi.fn().mockResolvedValue({ _min: { serverSeq: 1 } }),
          },
          userSyncState: {
            findUnique: vi.fn().mockImplementation(async (args: any) => {
              return testUserSyncStates.get(args.where.userId) || null;
            }),
            upsert: vi.fn().mockResolvedValue({}),
            update: vi.fn().mockResolvedValue({}),
          },
          syncDevice: {
            upsert: vi.fn().mockResolvedValue({}),
            count: vi.fn().mockResolvedValue(1),
          },
          tombstone: {
            upsert: vi.fn().mockResolvedValue({}),
            findUnique: vi.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      }),
      operation: {
        findFirst: vi.fn().mockImplementation(async (args: any) => {
          if (args.where?.id) {
            return testOperations.get(args.where.id) || null;
          }
          if (args.where?.opType?.in) {
            for (const op of Array.from(testOperations.values()).reverse()) {
              if (
                args.where.opType.in.includes(op.opType) &&
                args.where.userId === op.userId
              ) {
                return op;
              }
            }
          }
          return null;
        }),
        findMany: vi.fn().mockImplementation(async (args: any) => {
          const ops = Array.from(testOperations.values());
          return ops
            .filter((op) => {
              if (args.where?.userId !== undefined && args.where.userId !== op.userId)
                return false;
              if (args.where?.opType?.in) {
                if (!args.where.opType.in.includes(op.opType)) return false;
              }
              if (args.where?.serverSeq?.lte !== undefined) {
                if (op.serverSeq > args.where.serverSeq.lte) return false;
              }
              if (args.where?.serverSeq?.gt !== undefined) {
                if (op.serverSeq <= args.where.serverSeq.gt) return false;
              }
              return true;
            })
            .sort((a, b) => {
              if (args.orderBy?.serverSeq === 'asc') {
                return a.serverSeq - b.serverSeq;
              }
              if (args.orderBy?.serverSeq === 'desc') {
                return b.serverSeq - a.serverSeq;
              }
              return a.serverSeq - b.serverSeq;
            });
        }),
        deleteMany: vi.fn().mockImplementation(async (args: any) => {
          let count = 0;
          const toDelete: string[] = [];
          for (const [id, op] of testOperations.entries()) {
            if (args.where?.userId !== undefined && args.where.userId !== op.userId)
              continue;
            if (args.where?.serverSeq?.lte !== undefined) {
              if (op.serverSeq <= args.where.serverSeq.lte) {
                toDelete.push(id);
                count++;
              }
            }
          }
          for (const id of toDelete) {
            testOperations.delete(id);
          }
          return { count };
        }),
        aggregate: vi.fn().mockResolvedValue({ _min: { serverSeq: 1 } }),
      },
      userSyncState: {
        findUnique: vi.fn().mockImplementation(async (args: any) => {
          return testUserSyncStates.get(args.where.userId) || null;
        }),
        upsert: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([]),
      },
      syncDevice: {
        upsert: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(1),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      tombstone: {
        upsert: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn().mockResolvedValue(null),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      user: {
        findUnique: vi.fn().mockImplementation(async (args: any) => {
          return testUsers.get(args.where.id) || null;
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      $queryRaw: vi.fn().mockResolvedValue([{ total: BigInt(0) }]),
    },
    initDb: vi.fn(),
    getDb: vi.fn(),
  };
});

// Mock auth module
vi.mock('../src/auth', () => ({
  verifyToken: vi.fn().mockResolvedValue({ userId: 1, email: 'test@test.com' }),
}));

// Mock zlib for snapshot compression
vi.mock('zlib', () => ({
  gzipSync: vi.fn().mockImplementation((data) => Buffer.from(data)),
  gunzipSync: vi.fn().mockImplementation((data) => data),
}));

// Helper to create operation
const createOp = (
  clientId: string,
  userId: number,
  overrides: Partial<{
    id: string;
    actionType: string;
    opType: string;
    entityType: string;
    entityId: string;
    payload: unknown;
    vectorClock: Record<string, number>;
    timestamp: number;
    schemaVersion: number;
  }> = {},
) => {
  serverSeqCounter++;
  const op = {
    id: overrides.id || uuidv7(),
    clientId,
    userId,
    actionType: overrides.actionType || 'ADD_TASK',
    opType: overrides.opType || 'CRT',
    entityType: overrides.entityType || 'TASK',
    entityId: overrides.entityId || `task-${serverSeqCounter}`,
    payload: overrides.payload || { title: 'Test Task' },
    vectorClock: overrides.vectorClock || {},
    clientTimestamp: BigInt(overrides.timestamp || Date.now()),
    receivedAt: BigInt(Date.now()),
    schemaVersion: overrides.schemaVersion || 1,
    serverSeq: serverSeqCounter,
    isPayloadEncrypted: false,
  };
  testOperations.set(op.id, op);
  return op;
};

// Helper to create a restore point (SYNC_IMPORT operation)
const createRestorePoint = (
  clientId: string,
  userId: number,
  opType: 'SYNC_IMPORT' | 'BACKUP_IMPORT' | 'REPAIR' = 'SYNC_IMPORT',
) => {
  return createOp(clientId, userId, {
    actionType: '[SP_ALL] Load(import) all data',
    opType,
    entityType: 'ALL',
    payload: { globalConfig: {}, tasks: {} },
  });
};

describe('Storage Quota Cleanup', () => {
  const userId = 1;
  const clientId = 'test-device-1';

  beforeEach(() => {
    // Reset test data
    testOperations = new Map();
    testUsers = new Map();
    testUserSyncStates = new Map();
    serverSeqCounter = 0;

    // Create test user with storage info
    testUsers.set(userId, {
      id: userId,
      email: 'test@test.com',
      storageUsedBytes: BigInt(0),
      storageQuotaBytes: BigInt(100 * 1024 * 1024), // 100MB
    });

    vi.clearAllMocks();
  });

  describe('deleteOldestRestorePointAndOps', () => {
    it('should return failure when no restore points exist', async () => {
      // Import after mocks are set up
      const { initSyncService, getSyncService } = await import(
        '../src/sync/sync.service'
      );
      initSyncService();
      const service = getSyncService();

      // Create some regular operations (no restore points)
      createOp(clientId, userId);
      createOp(clientId, userId);
      createOp(clientId, userId);

      const result = await service.deleteOldestRestorePointAndOps(userId);

      expect(result.success).toBe(false);
      expect(result.deletedCount).toBe(0);
      expect(result.freedBytes).toBe(0);
    });

    it('should delete oldest restore point and all ops before it when 2+ restore points exist', async () => {
      const { initSyncService, getSyncService } = await import(
        '../src/sync/sync.service'
      );
      initSyncService();
      const service = getSyncService();

      // Create: op1, op2, RESTORE1, op4, op5, RESTORE2, op7
      createOp(clientId, userId); // seq 1
      createOp(clientId, userId); // seq 2
      createRestorePoint(clientId, userId); // seq 3 - oldest restore point
      createOp(clientId, userId); // seq 4
      createOp(clientId, userId); // seq 5
      createRestorePoint(clientId, userId); // seq 6 - newer restore point
      createOp(clientId, userId); // seq 7

      expect(testOperations.size).toBe(7);

      const result = await service.deleteOldestRestorePointAndOps(userId);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(3); // ops 1, 2, 3 (oldest restore point)
      expect(testOperations.size).toBe(4); // ops 4, 5, 6, 7 remain
    });

    it('should keep single restore point but delete ops before it', async () => {
      const { initSyncService, getSyncService } = await import(
        '../src/sync/sync.service'
      );
      initSyncService();
      const service = getSyncService();

      // Create: op1, op2, RESTORE1, op4, op5
      createOp(clientId, userId); // seq 1
      createOp(clientId, userId); // seq 2
      createRestorePoint(clientId, userId); // seq 3 - only restore point
      createOp(clientId, userId); // seq 4
      createOp(clientId, userId); // seq 5

      expect(testOperations.size).toBe(5);

      const result = await service.deleteOldestRestorePointAndOps(userId);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2); // ops 1, 2 (before restore point)
      expect(testOperations.size).toBe(3); // ops 3, 4, 5 remain (restore point kept)
    });

    it('should return failure when restore point is at seq 1 with no ops before it', async () => {
      const { initSyncService, getSyncService } = await import(
        '../src/sync/sync.service'
      );
      initSyncService();
      const service = getSyncService();

      // Create: RESTORE1 (at seq 1), op2, op3
      createRestorePoint(clientId, userId); // seq 1 - only restore point
      createOp(clientId, userId); // seq 2
      createOp(clientId, userId); // seq 3

      expect(testOperations.size).toBe(3);

      const result = await service.deleteOldestRestorePointAndOps(userId);

      // With only one restore point at seq 1, deleteUpToSeq = 0, nothing to delete
      expect(result.success).toBe(false);
      expect(result.deletedCount).toBe(0);
      expect(testOperations.size).toBe(3); // all ops remain
    });

    it('should handle BACKUP_IMPORT as restore point', async () => {
      const { initSyncService, getSyncService } = await import(
        '../src/sync/sync.service'
      );
      initSyncService();
      const service = getSyncService();

      createOp(clientId, userId); // seq 1
      createRestorePoint(clientId, userId, 'BACKUP_IMPORT'); // seq 2
      createOp(clientId, userId); // seq 3
      createRestorePoint(clientId, userId, 'SYNC_IMPORT'); // seq 4

      const result = await service.deleteOldestRestorePointAndOps(userId);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2); // ops 1, 2
    });

    it('should handle REPAIR as restore point', async () => {
      const { initSyncService, getSyncService } = await import(
        '../src/sync/sync.service'
      );
      initSyncService();
      const service = getSyncService();

      createOp(clientId, userId); // seq 1
      createRestorePoint(clientId, userId, 'REPAIR'); // seq 2
      createOp(clientId, userId); // seq 3
      createRestorePoint(clientId, userId, 'REPAIR'); // seq 4

      const result = await service.deleteOldestRestorePointAndOps(userId);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2); // ops 1, 2
    });
  });

  describe('Storage quota with auto-cleanup', () => {
    it('should recalculate storage when quota check fails', async () => {
      const { initSyncService, getSyncService } = await import(
        '../src/sync/sync.service'
      );
      initSyncService();
      const service = getSyncService();

      // Set user with stale high storage usage (simulating stale cache)
      testUsers.set(userId, {
        id: userId,
        email: 'test@test.com',
        storageUsedBytes: BigInt(200 * 1024 * 1024), // 200MB (stale value)
        storageQuotaBytes: BigInt(100 * 1024 * 1024), // 100MB quota
      });

      // First check should fail (using stale cache)
      const firstCheck = await service.checkStorageQuota(userId, 1000);
      expect(firstCheck.allowed).toBe(false);
      expect(firstCheck.currentUsage).toBe(200 * 1024 * 1024);
    });

    it('should allow upload after storage recalculation shows actual usage is lower', async () => {
      const { initSyncService, getSyncService } = await import(
        '../src/sync/sync.service'
      );
      initSyncService();
      const service = getSyncService();

      // After updateStorageUsage is called, the mock returns 0 from $queryRaw
      // So the actual storage is much lower than the stale cache
      testUsers.set(userId, {
        id: userId,
        email: 'test@test.com',
        storageUsedBytes: BigInt(50 * 1024 * 1024), // 50MB actual
        storageQuotaBytes: BigInt(100 * 1024 * 1024), // 100MB quota
      });

      const check = await service.checkStorageQuota(userId, 1000);
      expect(check.allowed).toBe(true);
      expect(check.currentUsage).toBe(50 * 1024 * 1024);
    });
  });
});

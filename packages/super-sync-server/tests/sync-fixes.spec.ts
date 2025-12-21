/**
 * Tests for sync system fixes (Issues 1-5)
 *
 * These tests verify the fixes implemented for the identified sync issues:
 * - Issue 1: Request deduplication with piggybacking
 * - Issue 3: Encrypted snapshot uploads
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { uuidv7 } from 'uuidv7';

// Store for test data
let testOperations: Map<string, any>;
let serverSeqCounter: number;
let requestCache: Map<string, any>;

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
              // Find by ID
              if (args.where?.id) {
                return testOperations.get(args.where.id) || null;
              }
              // Find full-state operation
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
                  if (
                    args.where?.serverSeq?.gt !== undefined &&
                    op.serverSeq <= args.where.serverSeq.gt
                  )
                    return false;
                  if (
                    args.where?.clientId?.not &&
                    op.clientId === args.where.clientId.not
                  )
                    return false;
                  return true;
                })
                .sort((a, b) => a.serverSeq - b.serverSeq)
                .slice(0, args.take || 500);
            }),
            aggregate: vi.fn().mockResolvedValue({ _min: { serverSeq: 1 } }),
          },
          userSyncState: {
            findUnique: vi.fn().mockResolvedValue({ lastSeq: serverSeqCounter }),
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
        findFirst: vi.fn(),
        findMany: vi.fn().mockImplementation(async (args: any) => {
          const ops = Array.from(testOperations.values());
          return ops
            .filter((op) => {
              if (args.where?.userId !== undefined && args.where.userId !== op.userId)
                return false;
              if (
                args.where?.serverSeq?.gt !== undefined &&
                op.serverSeq <= args.where.serverSeq.gt
              )
                return false;
              if (args.where?.clientId?.not && op.clientId === args.where.clientId.not)
                return false;
              return true;
            })
            .sort((a, b) => a.serverSeq - b.serverSeq)
            .slice(0, args.take || 500);
        }),
        aggregate: vi.fn().mockResolvedValue({ _min: { serverSeq: 1 } }),
      },
      userSyncState: {
        findUnique: vi.fn().mockImplementation(async () => ({
          lastSeq: serverSeqCounter,
        })),
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
        findUnique: vi.fn().mockResolvedValue({
          id: 1,
          storageQuotaBytes: BigInt(100 * 1024 * 1024),
          storageUsedBytes: BigInt(0),
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      $queryRaw: vi.fn().mockResolvedValue([{ total: BigInt(0) }]),
    },
  };
});

// Mock auth
vi.mock('../src/auth', () => ({
  verifyToken: vi.fn().mockResolvedValue({ userId: 1, email: 'test@test.com' }),
}));

// Import after mocking
import { syncRoutes } from '../src/sync/sync.routes';
import { initSyncService } from '../src/sync/sync.service';

// Helper to create operation
const createOp = (
  clientId: string,
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
) => ({
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
  ...overrides,
});

describe('Sync System Fixes', () => {
  let app: FastifyInstance;
  const authToken = 'mock-token';

  beforeEach(async () => {
    // Reset test state
    testOperations = new Map();
    serverSeqCounter = 0;
    requestCache = new Map();
    vi.clearAllMocks();

    // Initialize service
    initSyncService();

    // Create Fastify app
    app = Fastify();
    await app.register(syncRoutes, { prefix: '/api/sync' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // =============================================================================
  // Issue 1: Request deduplication with piggybacking
  // =============================================================================
  describe('Issue 1: Request deduplication with piggybacking', () => {
    it('should return fresh newOps on deduplicated request', async () => {
      const clientA = 'client-a';
      const clientB = 'client-b';
      const requestId = 'req-123';

      // Step 1: Client A uploads with requestId
      const firstResponse = await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          ops: [createOp(clientA, { entityId: 'task-a' })],
          clientId: clientA,
          lastKnownServerSeq: 0,
          requestId,
        },
      });
      expect(firstResponse.statusCode).toBe(200);
      const firstBody = firstResponse.json();
      expect(firstBody.results[0].accepted).toBe(true);
      const clientASeq = firstBody.latestSeq;

      // Step 2: Client B uploads ops
      const clientBResponse = await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          ops: [createOp(clientB, { entityId: 'task-b' })],
          clientId: clientB,
        },
      });
      expect(clientBResponse.statusCode).toBe(200);

      // Step 3: Client A retries with same requestId but updated lastKnownServerSeq
      const retryResponse = await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          ops: [createOp(clientA, { entityId: 'task-a' })],
          clientId: clientA,
          lastKnownServerSeq: clientASeq,
          requestId,
        },
      });

      expect(retryResponse.statusCode).toBe(200);
      const retryBody = retryResponse.json();

      // Should be deduplicated
      expect(retryBody.deduplicated).toBe(true);

      // CRITICAL: Should have piggybacked ops from client B
      expect(retryBody.newOps).toBeDefined();
      expect(retryBody.newOps.length).toBeGreaterThan(0);
      expect(
        retryBody.newOps.some(
          (op: { op: { clientId: string } }) => op.op.clientId === clientB,
        ),
      ).toBe(true);
    });

    it('should use retry request lastKnownServerSeq, not original', async () => {
      const clientA = 'client-a';
      const clientB = 'client-b';
      const requestId = 'req-456';

      // Client A uploads
      await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          ops: [createOp(clientA, { entityId: 'task-1' })],
          clientId: clientA,
          lastKnownServerSeq: 0,
          requestId,
        },
      });

      // Client B uploads
      await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          ops: [createOp(clientB, { entityId: 'task-2' })],
          clientId: clientB,
        },
      });

      // Client A retries with lastKnownServerSeq=0
      const retryResponse = await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          ops: [createOp(clientA, { entityId: 'task-1' })],
          clientId: clientA,
          lastKnownServerSeq: 0,
          requestId,
        },
      });

      const body = retryResponse.json();
      expect(body.deduplicated).toBe(true);
      // Should get client B's ops since lastKnownServerSeq=0
      expect(body.newOps?.length).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // Issue 3: Encrypted snapshot uploads
  // =============================================================================
  describe('Issue 3: Encrypted snapshot uploads', () => {
    it('should store isPayloadEncrypted flag from snapshot upload', async () => {
      const snapshotResponse = await app.inject({
        method: 'POST',
        url: '/api/sync/snapshot',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          state: 'encrypted-string-here',
          clientId: 'test-client',
          reason: 'recovery',
          vectorClock: { 'test-client': 1 },
          schemaVersion: 1,
          isPayloadEncrypted: true,
        },
      });

      expect(snapshotResponse.statusCode).toBe(200);
      const snapshotBody = snapshotResponse.json();
      expect(snapshotBody.accepted).toBe(true);

      // Download ops and verify the SYNC_IMPORT has isPayloadEncrypted
      const downloadResponse = await app.inject({
        method: 'GET',
        url: '/api/sync/ops?sinceSeq=0',
        headers: { authorization: `Bearer ${authToken}` },
      });

      const downloadBody = downloadResponse.json();
      const syncImportOp = downloadBody.ops.find(
        (op: { op: { opType: string } }) => op.op.opType === 'SYNC_IMPORT',
      );
      expect(syncImportOp).toBeDefined();
      expect(syncImportOp.op.isPayloadEncrypted).toBe(true);
    });

    it('should default isPayloadEncrypted to false when not provided', async () => {
      const snapshotResponse = await app.inject({
        method: 'POST',
        url: '/api/sync/snapshot',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          state: { tasks: [] },
          clientId: 'test-client',
          reason: 'initial',
          vectorClock: { 'test-client': 1 },
          schemaVersion: 1,
        },
      });

      expect(snapshotResponse.statusCode).toBe(200);

      // Download and verify default
      const downloadResponse = await app.inject({
        method: 'GET',
        url: '/api/sync/ops?sinceSeq=0',
        headers: { authorization: `Bearer ${authToken}` },
      });

      const downloadBody = downloadResponse.json();
      const syncImportOp = downloadBody.ops.find(
        (op: { op: { opType: string } }) => op.op.opType === 'SYNC_IMPORT',
      );
      expect(syncImportOp.op.isPayloadEncrypted).toBe(false);
    });
  });
});

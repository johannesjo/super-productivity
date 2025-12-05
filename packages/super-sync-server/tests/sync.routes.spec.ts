import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { initDb, getDb } from '../src/db';
import { initSyncService } from '../src/sync/sync.service';
import { syncRoutes } from '../src/sync/sync.routes';
import { uuidv7 } from 'uuidv7';
import * as jwt from 'jsonwebtoken';

// Mock the JWT secret for tests
const JWT_SECRET = 'super-sync-dev-secret-do-not-use-in-production';

// Helper to create valid JWT token
const createToken = (userId: number, email: string): string => {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
};

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

describe('Sync Routes', () => {
  let app: FastifyInstance;
  const userId = 1;
  const clientId = 'test-device-1';
  let authToken: string;

  beforeEach(async () => {
    // Initialize in-memory database
    initDb('./data', true);
    const db = getDb();

    // Create test user
    db.prepare(
      `INSERT INTO users (id, email, password_hash, is_verified, created_at)
       VALUES (?, 'test@test.com', 'hash', 1, ?)`,
    ).run(userId, Date.now());

    // Initialize sync service
    initSyncService();

    // Create auth token
    authToken = createToken(userId, 'test@test.com');

    // Create Fastify instance with sync routes
    app = Fastify();
    await app.register(syncRoutes, { prefix: '/api/sync' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/sync/ops - Upload Operations', () => {
    it('should upload operations successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          ops: [createOp(clientId)],
          clientId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.results).toHaveLength(1);
      expect(body.results[0].accepted).toBe(true);
      expect(body.results[0].serverSeq).toBe(1);
      expect(body.latestSeq).toBe(1);
    });

    it('should return 401 without authorization header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        payload: {
          ops: [createOp(clientId)],
          clientId,
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe('Missing or invalid Authorization header');
    });

    it('should return 401 with invalid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: {
          authorization: 'Bearer invalid-token',
        },
        payload: {
          ops: [createOp(clientId)],
          clientId,
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe('Invalid token');
    });

    it('should return 400 for empty ops array', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          ops: [],
          clientId,
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('Validation failed');
    });

    it('should return 400 for missing clientId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          ops: [createOp(clientId)],
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('Validation failed');
    });

    it('should return 400 for invalid opType', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          ops: [createOp(clientId, { opType: 'INVALID' })],
          clientId,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should include new ops when lastKnownServerSeq is provided', async () => {
      // First, upload some ops from another client
      const otherClient = 'other-client';
      await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          ops: [createOp(otherClient, { entityId: 'task-other' })],
          clientId: otherClient,
        },
      });

      // Now upload from our client with lastKnownServerSeq=0
      const response = await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          ops: [createOp(clientId)],
          clientId,
          lastKnownServerSeq: 0,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.newOps).toBeDefined();
      expect(body.newOps.length).toBeGreaterThan(0);
    });

    it('should handle multiple operations in one request', async () => {
      const ops = [
        createOp(clientId, { entityId: 'task-1' }),
        createOp(clientId, { entityId: 'task-2' }),
        createOp(clientId, { entityId: 'task-3' }),
      ];

      const response = await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { ops, clientId },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.results).toHaveLength(3);
      expect(body.results.every((r: { accepted: boolean }) => r.accepted)).toBe(true);
    });
  });

  describe('GET /api/sync/ops - Download Operations', () => {
    beforeEach(async () => {
      // Upload some operations first
      for (let i = 1; i <= 5; i++) {
        await app.inject({
          method: 'POST',
          url: '/api/sync/ops',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            ops: [createOp(clientId, { entityId: `task-${i}` })],
            clientId,
          },
        });
      }
    });

    it('should download operations since given sequence', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/sync/ops?sinceSeq=2',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ops).toHaveLength(3);
      expect(body.ops[0].serverSeq).toBe(3);
      expect(body.hasMore).toBe(false);
      expect(body.latestSeq).toBe(5);
    });

    it('should return 401 without authorization', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/sync/ops?sinceSeq=0',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 for missing sinceSeq', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/sync/ops',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should respect limit parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/sync/ops?sinceSeq=0&limit=2',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ops).toHaveLength(2);
      expect(body.hasMore).toBe(true);
    });

    it('should exclude operations from specified client', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/sync/ops?sinceSeq=0&excludeClient=${clientId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ops).toHaveLength(0);
    });

    it('should return empty array when no operations exist after sequence', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/sync/ops?sinceSeq=100',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ops).toHaveLength(0);
    });
  });

  describe('GET /api/sync/snapshot - Get Snapshot', () => {
    beforeEach(async () => {
      // Upload some operations
      await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          ops: [
            createOp(clientId, {
              entityId: 't1',
              payload: { title: 'Task 1', done: false },
            }),
          ],
          clientId,
        },
      });
    });

    it('should return current state snapshot', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/sync/snapshot',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.serverSeq).toBe(1);
      expect(body.state).toBeDefined();
      expect(body.generatedAt).toBeDefined();
    });

    it('should return 401 without authorization', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/sync/snapshot',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/sync/snapshot - Upload Snapshot', () => {
    it('should upload snapshot successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/sync/snapshot',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          state: { task: { t1: { title: 'Task 1' } } },
          clientId,
          reason: 'initial',
          vectorClock: { [clientId]: 1 },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.accepted).toBe(true);
      expect(body.serverSeq).toBeDefined();
    });

    it('should return 401 without authorization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/sync/snapshot',
        payload: {
          state: {},
          clientId,
          reason: 'initial',
          vectorClock: {},
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 for invalid reason', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/sync/snapshot',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          state: {},
          clientId,
          reason: 'invalid-reason',
          vectorClock: {},
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/sync/snapshot',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          state: {},
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/sync/status - Get Sync Status', () => {
    it('should return sync status', async () => {
      // Upload some ops first
      await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          ops: [createOp(clientId)],
          clientId,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/sync/status',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.latestSeq).toBeDefined();
      expect(body.devicesOnline).toBeDefined();
      expect(body.pendingOps).toBeDefined();
    });

    it('should return 401 without authorization', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/sync/status',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/sync/devices/:clientId/ack - Acknowledge Operations', () => {
    beforeEach(async () => {
      // Upload some ops to create device
      await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          ops: [createOp(clientId)],
          clientId,
        },
      });
    });

    it('should acknowledge operations', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/sync/devices/${clientId}/ack`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          lastSeq: 1,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.acknowledged).toBe(true);
    });

    it('should return 401 without authorization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/sync/devices/${clientId}/ack`,
        payload: { lastSeq: 1 },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 for invalid lastSeq', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/sync/devices/${clientId}/ack`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          lastSeq: -1,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for missing lastSeq', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/sync/devices/${clientId}/ack`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

describe('Multi-User Isolation', () => {
  let app: FastifyInstance;
  const user1Id = 1;
  const user2Id = 2;
  const clientId = 'test-device';
  let user1Token: string;
  let user2Token: string;

  beforeEach(async () => {
    initDb('./data', true);
    const db = getDb();

    // Create two test users
    db.prepare(
      `INSERT INTO users (id, email, password_hash, is_verified, created_at)
       VALUES (?, 'user1@test.com', 'hash', 1, ?)`,
    ).run(user1Id, Date.now());

    db.prepare(
      `INSERT INTO users (id, email, password_hash, is_verified, created_at)
       VALUES (?, 'user2@test.com', 'hash', 1, ?)`,
    ).run(user2Id, Date.now());

    initSyncService();

    user1Token = createToken(user1Id, 'user1@test.com');
    user2Token = createToken(user2Id, 'user2@test.com');

    app = Fastify();
    await app.register(syncRoutes, { prefix: '/api/sync' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should isolate operations between users', async () => {
    // User 1 uploads an operation
    await app.inject({
      method: 'POST',
      url: '/api/sync/ops',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        ops: [createOp(clientId, { entityId: 'user1-task' })],
        clientId,
      },
    });

    // User 2 uploads an operation
    await app.inject({
      method: 'POST',
      url: '/api/sync/ops',
      headers: { authorization: `Bearer ${user2Token}` },
      payload: {
        ops: [createOp(clientId, { entityId: 'user2-task' })],
        clientId,
      },
    });

    // User 1 should only see their operation
    const user1Response = await app.inject({
      method: 'GET',
      url: '/api/sync/ops?sinceSeq=0',
      headers: { authorization: `Bearer ${user1Token}` },
    });

    expect(user1Response.statusCode).toBe(200);
    const user1Body = user1Response.json();
    expect(user1Body.ops).toHaveLength(1);
    expect(user1Body.ops[0].op.entityId).toBe('user1-task');

    // User 2 should only see their operation
    const user2Response = await app.inject({
      method: 'GET',
      url: '/api/sync/ops?sinceSeq=0',
      headers: { authorization: `Bearer ${user2Token}` },
    });

    expect(user2Response.statusCode).toBe(200);
    const user2Body = user2Response.json();
    expect(user2Body.ops).toHaveLength(1);
    expect(user2Body.ops[0].op.entityId).toBe('user2-task');
  });

  it('should isolate snapshots between users', async () => {
    // User 1 uploads operations
    await app.inject({
      method: 'POST',
      url: '/api/sync/ops',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        ops: [
          createOp(clientId, {
            entityId: 'user1-task',
            payload: { title: 'User 1 Task' },
          }),
        ],
        clientId,
      },
    });

    // User 2 uploads operations
    await app.inject({
      method: 'POST',
      url: '/api/sync/ops',
      headers: { authorization: `Bearer ${user2Token}` },
      payload: {
        ops: [
          createOp(clientId, {
            entityId: 'user2-task',
            payload: { title: 'User 2 Task' },
          }),
        ],
        clientId,
      },
    });

    // Get user 1's snapshot
    const user1Snapshot = await app.inject({
      method: 'GET',
      url: '/api/sync/snapshot',
      headers: { authorization: `Bearer ${user1Token}` },
    });

    const user1State = user1Snapshot.json().state as Record<
      string,
      Record<string, { title: string }>
    >;
    expect(user1State.TASK['user1-task']).toBeDefined();
    expect(user1State.TASK['user2-task']).toBeUndefined();

    // Get user 2's snapshot
    const user2Snapshot = await app.inject({
      method: 'GET',
      url: '/api/sync/snapshot',
      headers: { authorization: `Bearer ${user2Token}` },
    });

    const user2State = user2Snapshot.json().state as Record<
      string,
      Record<string, { title: string }>
    >;
    expect(user2State.TASK['user2-task']).toBeDefined();
    expect(user2State.TASK['user1-task']).toBeUndefined();
  });

  it('should isolate sync status between users', async () => {
    // User 1 uploads 3 operations
    for (let i = 1; i <= 3; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: { authorization: `Bearer ${user1Token}` },
        payload: {
          ops: [createOp(clientId, { entityId: `task-${i}` })],
          clientId,
        },
      });
    }

    // User 2 uploads 1 operation
    await app.inject({
      method: 'POST',
      url: '/api/sync/ops',
      headers: { authorization: `Bearer ${user2Token}` },
      payload: {
        ops: [createOp(clientId)],
        clientId,
      },
    });

    // Check user 1's status
    const user1Status = await app.inject({
      method: 'GET',
      url: '/api/sync/status',
      headers: { authorization: `Bearer ${user1Token}` },
    });

    expect(user1Status.json().latestSeq).toBe(3);

    // Check user 2's status
    const user2Status = await app.inject({
      method: 'GET',
      url: '/api/sync/status',
      headers: { authorization: `Bearer ${user2Token}` },
    });

    expect(user2Status.json().latestSeq).toBe(1);
  });
});

describe('Concurrent Operations', () => {
  let app: FastifyInstance;
  const userId = 1;
  let authToken: string;

  beforeEach(async () => {
    initDb('./data', true);
    const db = getDb();

    db.prepare(
      `INSERT INTO users (id, email, password_hash, is_verified, created_at)
       VALUES (?, 'test@test.com', 'hash', 1, ?)`,
    ).run(userId, Date.now());

    initSyncService();
    authToken = createToken(userId, 'test@test.com');

    app = Fastify();
    await app.register(syncRoutes, { prefix: '/api/sync' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should handle concurrent uploads from multiple clients', async () => {
    const clients = ['client-1', 'client-2', 'client-3'];

    // Simulate concurrent uploads
    const uploadPromises = clients.map((clientId) =>
      app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          ops: [createOp(clientId, { entityId: `${clientId}-task` })],
          clientId,
        },
      }),
    );

    const responses = await Promise.all(uploadPromises);

    // All should succeed
    responses.forEach((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.json().results[0].accepted).toBe(true);
    });

    // All operations should be stored
    const downloadResponse = await app.inject({
      method: 'GET',
      url: '/api/sync/ops?sinceSeq=0',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(downloadResponse.json().ops).toHaveLength(3);
  });

  it('should assign unique sequential server_seq to concurrent operations', async () => {
    const clients = ['client-1', 'client-2', 'client-3', 'client-4', 'client-5'];

    const uploadPromises = clients.map((clientId) =>
      app.inject({
        method: 'POST',
        url: '/api/sync/ops',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          ops: [createOp(clientId, { entityId: `${clientId}-task` })],
          clientId,
        },
      }),
    );

    await Promise.all(uploadPromises);

    const downloadResponse = await app.inject({
      method: 'GET',
      url: '/api/sync/ops?sinceSeq=0',
      headers: { authorization: `Bearer ${authToken}` },
    });

    const ops = downloadResponse.json().ops;
    const serverSeqs = ops.map((op: { serverSeq: number }) => op.serverSeq);

    // All sequences should be unique
    expect(new Set(serverSeqs).size).toBe(serverSeqs.length);

    // Sequences should be 1, 2, 3, 4, 5 (in some order)
    expect(serverSeqs.sort((a: number, b: number) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });
});

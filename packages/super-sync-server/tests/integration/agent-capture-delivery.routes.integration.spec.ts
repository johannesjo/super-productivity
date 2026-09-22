/** Authenticated capture delivery through real Fastify and PostgreSQL. */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET ??= 'capture-delivery-test-secret-at-least-32-characters';
});
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as jwt from 'jsonwebtoken';
import { encrypt } from '@sp/sync-core';
import { prisma } from '../../src/db';
import { createServer } from '../../src/server';
import { SyncService } from '../../src/sync/sync.service';
import type { Operation } from '../../src/sync/sync.types';
import {
  createAgentCapturePublicationHarness,
  getAgentCaptureActorId,
} from './agent-capture-publication.harness';

const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip;

describeWithDb('agent capture delivery routes (PostgreSQL)', () => {
  const harness = createAgentCapturePublicationHarness(prisma);
  const users: number[] = [];
  const runId = `${Date.now()}-${process.pid}`;
  let serial = 0;
  let server: ReturnType<typeof createServer>;
  let address: string;
  let dataDir: string;
  const unique = (prefix: string): string => `${prefix}-${runId}-${++serial}`;
  const createUser = async () => {
    const email = `${unique('capture-delivery')}@test.local`;
    const user = await prisma.user.create({ data: { email, isVerified: 1 } });
    users.push(user.id);
    return {
      userId: user.id,
      email,
      token: jwt.sign(
        { userId: user.id, email, tokenVersion: user.tokenVersion ?? 0 },
        process.env.JWT_SECRET!,
      ),
    };
  };
  const request = (path: string, token: string, body?: unknown) =>
    fetch(`${address}/api/sync/captures/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  beforeAll(async () => {
    await harness.initialize();
    dataDir = await mkdtemp(join(tmpdir(), 'sp-capture-delivery-'));
    server = createServer({
      port: Number(process.env.CAPTURE_HTTP_TEST_PORT ?? 1909),
      host: '127.0.0.1',
      dataDir,
      agentCaptureDeliveryEnabled: true,
    });
    address = await server.start();
  });
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    users.length = 0;
  });
  afterAll(async () => {
    await server?.stop();
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
  });

  it('reads only its own pending capture and publishes an encrypted task once', async () => {
    const owner = await createUser();
    const other = await createUser();
    const captureId = unique('capture');
    await harness.enqueueCapture({ userId: owner.userId, captureId, title: 'Task' });

    const unauthorized = await fetch(`${address}/api/sync/captures/pending`);
    expect(unauthorized.status).toBe(401);
    expect((await (await request('pending', other.token)).json()).capture).toBeNull();

    const key = 'capture-delivery-route-test-password';
    const baseline: Operation = {
      id: unique('baseline'),
      clientId: unique('baseline-author'),
      actionType: '[SP_ALL] Load(import) all data',
      opType: 'SYNC_IMPORT',
      entityType: 'ALL',
      payload: await encrypt(JSON.stringify({ appDataComplete: { TASK: {} } }), key),
      isPayloadEncrypted: true,
      vectorClock: {},
      timestamp: Date.now(),
      schemaVersion: 1,
    };
    baseline.vectorClock[baseline.clientId] = 1;
    expect(
      (
        await new SyncService().uploadOps(
          owner.userId,
          baseline.clientId,
          [baseline],
          true,
        )
      )[0].accepted,
    ).toBe(true);

    const pendingResponse = await request('pending', owner.token);
    expect(pendingResponse.status).toBe(200);
    const pending = (await pendingResponse.json()).capture;
    expect(pending).toMatchObject({
      captureId,
      title: 'Task',
      publisherClientId: getAgentCaptureActorId(owner.userId),
      captureCounter: 0,
      encryptionBaseline: { opId: baseline.id, serverSeq: 1 },
    });
    const taskId = `capture-${captureId}`;
    const candidate: Operation = {
      id: unique('candidate'),
      clientId: pending.publisherClientId,
      actionType: '[Task Shared] addTask',
      opType: 'CRT',
      entityType: 'TASK',
      entityId: taskId,
      entityIds: [taskId],
      payload: await encrypt(
        JSON.stringify({ actionPayload: { task: { id: taskId, title: 'Task' } } }),
        key,
      ),
      isPayloadEncrypted: true,
      vectorClock: { ...baseline.vectorClock, [pending.publisherClientId]: 1 },
      timestamp: Date.now(),
      schemaVersion: 1,
    };
    const publication = {
      captureId,
      candidate,
      lastKnownServerSeq: 1,
      expectedCaptureCounter: pending.captureCounter,
      expectedDataGeneration: pending.dataGeneration,
      verifiedEncryptionOpId: baseline.id,
    };
    const foreignPublish = await request('publish', other.token, publication);
    expect((await foreignPublish.json()).status).toBe('rejected');
    expect(
      await harness.readCaptureReceipt({ userId: owner.userId, captureId }),
    ).toBeNull();
    const first = await request('publish', owner.token, publication);
    expect(first.status).toBe(200);
    expect((await first.json()).status).toBe('published');
    const retry = await request('publish', owner.token, publication);
    expect(retry.status).toBe(200);
    expect((await retry.json()).status).toBe('already_published');
    expect((await (await request('pending', owner.token)).json()).capture).toBeNull();
    expect(
      await prisma.operation.count({
        where: { userId: owner.userId, clientId: candidate.clientId },
      }),
    ).toBe(1);
    const download = await fetch(`${address}/api/sync/ops?sinceSeq=1`, {
      headers: { Authorization: `Bearer ${owner.token}` },
    });
    expect(download.status).toBe(200);
    expect(
      (await download.json()).ops.map((entry: { op: { id: string } }) => entry.op.id),
    ).toContain(candidate.id);
  });

  it('rejects plaintext candidates without consuming the queue item', async () => {
    const user = await createUser();
    const captureId = unique('plaintext');
    await harness.enqueueCapture({ userId: user.userId, captureId, title: 'Private' });
    const taskId = `capture-${captureId}`;
    const candidate: Operation = {
      id: unique('candidate'),
      clientId: getAgentCaptureActorId(user.userId),
      actionType: '[Task Shared] addTask',
      opType: 'CRT',
      entityType: 'TASK',
      entityId: taskId,
      entityIds: [taskId],
      payload: { actionPayload: { task: { id: taskId, title: 'Private' } } },
      vectorClock: { [getAgentCaptureActorId(user.userId)]: 1 },
      timestamp: Date.now(),
      schemaVersion: 1,
    };
    const response = await request('publish', user.token, {
      captureId,
      candidate,
      lastKnownServerSeq: 0,
      expectedCaptureCounter: 0,
      expectedDataGeneration: 0,
    });
    expect(response.status).toBe(400);
    expect((await response.json()).errorCode).toBe('E2EE_REQUIRED');
    expect(
      await harness.readPendingCapture({ userId: user.userId, captureId }),
    ).not.toBeNull();
    expect(
      await harness.readCaptureReceipt({ userId: user.userId, captureId }),
    ).toBeNull();
  });

  it('gates the capability and both routes per allowlisted account', async () => {
    const listed = await createUser();
    const unlisted = await createUser();
    const narrowed = createServer({
      port: Number(process.env.CAPTURE_ALLOWLIST_HTTP_TEST_PORT ?? 1911),
      host: '127.0.0.1',
      dataDir,
      agentCaptureDeliveryEnabled: true,
      agentCaptureDeliveryEmails: [listed.email],
    });
    const narrowedAddress = await narrowed.start();
    const capability = async (token: string): Promise<boolean> => {
      const download = await fetch(`${narrowedAddress}/api/sync/ops?sinceSeq=0`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return (await download.json()).capabilities.captureDelivery;
    };
    const pending = (token: string) =>
      fetch(`${narrowedAddress}/api/sync/captures/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    try {
      expect(await capability(listed.token)).toBe(true);
      expect((await pending(listed.token)).status).toBe(200);
      expect(await capability(unlisted.token)).toBe(false);
      expect((await pending(unlisted.token)).status).toBe(503);
      const publish = await fetch(`${narrowedAddress}/api/sync/captures/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${unlisted.token}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      expect(publish.status).toBe(503);
    } finally {
      await narrowed.stop();
    }
  });

  it('advertises no capability and refuses reads and publication while paused', async () => {
    const user = await createUser();
    const paused = createServer({
      port: Number(process.env.CAPTURE_PAUSED_HTTP_TEST_PORT ?? 1910),
      host: '127.0.0.1',
      dataDir,
      agentCaptureDeliveryEnabled: false,
    });
    const pausedAddress = await paused.start();
    try {
      const download = await fetch(`${pausedAddress}/api/sync/ops?sinceSeq=0`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect((await download.json()).capabilities.captureDelivery).toBe(false);
      const pending = await fetch(`${pausedAddress}/api/sync/captures/pending`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(pending.status).toBe(503);
      const publish = await fetch(`${pausedAddress}/api/sync/captures/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      expect(publish.status).toBe(503);
    } finally {
      await paused.stop();
    }
  });
});

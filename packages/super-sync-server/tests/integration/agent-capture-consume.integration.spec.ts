/** Real PostgreSQL + authenticated HTTP/gzip, without mocked upload services. */
import { gzipSync } from 'node:zlib';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import * as jwt from 'jsonwebtoken';
import { decrypt, encrypt } from '@sp/sync-core';
import { prisma } from '../../src/db';
import type { createServer } from '../../src/server';
import { Operation, UploadOpsResponse } from '../../src/sync/sync.types';
import {
  createAgentCaptureConsumeHarness,
  getConsumedCaptureTaskId,
} from './agent-capture-consume.harness';

const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip;
const runId = `${Date.now()}-${process.pid}`;
describeWithDb('Consume-on-accept through ordinary HTTP upload (PostgreSQL)', () => {
  let server: ReturnType<typeof createServer>;
  let address: string;
  let dataDir: string;
  let dispose: (() => void) | undefined;
  let failAfterReceipt = false;
  let sequence = 0;
  const users: number[] = [];
  const harness = createAgentCaptureConsumeHarness(prisma, {
    afterReceiptWritten: () => {
      if (failAfterReceipt) throw new Error('Injected receipt transaction failure');
    },
  });
  const unique = (): string => `consume-${runId}-${++sequence}`;
  const createUser = async () => {
    const email = `${unique()}@test.local`;
    const user = await prisma.user.create({ data: { email, isVerified: 1 } });
    users.push(user.id);
    const token = jwt.sign(
      { userId: user.id, email, tokenVersion: user.tokenVersion ?? 0 },
      process.env.JWT_SECRET!,
    );
    return { userId: user.id, token };
  };
  const makeOp = async (
    captureId: string,
    clientId = unique(),
    overrides: Partial<Operation> = {},
  ): Promise<Operation> => ({
    id: unique(),
    clientId,
    captureId,
    actionType: '[Task Shared] addTask',
    opType: 'CRT',
    entityType: 'TASK',
    entityId: getConsumedCaptureTaskId(captureId),
    payload: await encrypt(
      JSON.stringify({
        actionPayload: {
          task: { id: getConsumedCaptureTaskId(captureId), title: 'Capture fixture' },
        },
      }),
      'capture-http-test-password',
    ),
    isPayloadEncrypted: true,
    vectorClock: { [clientId]: 1 },
    timestamp: Date.now(),
    schemaVersion: 1,
    ...overrides,
  });
  const upload = async (token: string, ops: Operation[], compressed = false) => {
    const serialized = JSON.stringify({
      clientId: ops[0].clientId,
      ops,
      lastKnownServerSeq: 0,
    });
    const response = await fetch(`${address}/api/sync/ops`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(compressed ? { 'Content-Encoding': 'gzip' } : {}),
      },
      body: compressed ? new Uint8Array(gzipSync(serialized)) : serialized,
    });
    expect(response.status).toBe(200);
    return (await response.json()) as UploadOpsResponse;
  };
  beforeAll(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'sp-consume-http-'));
    await harness.initialize();
    process.env.JWT_SECRET ??= 'capture-consume-test-secret-at-least-32-characters';
    const { createServer: makeServer } = await import('../../src/server');
    server = makeServer({
      port: Number(process.env.CAPTURE_HTTP_TEST_PORT ?? 1908),
      host: '127.0.0.1',
      dataDir,
    });
    address = await server.start();
  });
  afterEach(async () => {
    dispose?.();
    dispose = undefined;
    failAfterReceipt = false;
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    users.length = 0;
  });
  afterAll(async () => {
    await server?.stop();
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
  });

  it('reproduces ordinary upload accepting the op without consuming its capture', async () => {
    const user = await createUser();
    const captureId = unique();
    await harness.enqueueCapture({ ...user, captureId, title: 'Baseline' });
    const op = await makeOp(captureId);
    const result = await upload(user.token, [op], true);
    expect(result.results[0].accepted).toBe(true);
    expect(await harness.readCaptureReceipt({ ...user, captureId })).toBeNull();
  });

  it('consumes atomically through gzip and preserves winner retries after op pruning', async () => {
    dispose = harness.install();
    const user = await createUser();
    const captureId = unique();
    await harness.enqueueCapture({ ...user, captureId, title: 'Atomic capture' });
    const op = await makeOp(captureId);
    const accepted = await upload(user.token, [op], true);
    expect(accepted.results[0].accepted).toBe(true);
    const receipt = await harness.readCaptureReceipt({ ...user, captureId });
    expect(receipt).toEqual({
      captureId,
      opId: op.id,
      serverSeq: accepted.results[0].serverSeq,
    });
    const queue = await prisma.$queryRawUnsafe<
      Array<{ title: string | null; notes: string | null }>
    >(
      'SELECT title, notes FROM agent_capture_consume_spike_queue WHERE user_id = $1 AND capture_id = $2',
      user.userId,
      captureId,
    );
    expect(queue).toEqual([{ title: null, notes: null }]);
    expect((await upload(user.token, [op])).results[0].errorCode).toBe(
      'DUPLICATE_OPERATION',
    );
    const reencrypted = {
      ...op,
      payload: await encrypt(
        await decrypt(op.payload as string, 'capture-http-test-password'),
        'capture-http-test-password',
      ),
    };
    expect((await upload(user.token, [reencrypted])).results[0].errorCode).toBe(
      'DUPLICATE_OPERATION',
    );
    await prisma.operation.deleteMany({ where: { userId: user.userId } });
    expect((await upload(user.token, [op])).results[0].errorCode).toBe(
      'DUPLICATE_OPERATION',
    );
    expect(
      (await upload(user.token, [{ ...op, timestamp: op.timestamp + 1 }])).results[0]
        .errorCode,
    ).toBe('INVALID_OP_ID');
    const anotherCaptureId = unique();
    await harness.enqueueCapture({
      ...user,
      captureId: anotherCaptureId,
      title: 'Rebinding',
    });
    const rebound = {
      ...op,
      captureId: anotherCaptureId,
      entityId: getConsumedCaptureTaskId(anotherCaptureId),
    };
    expect((await upload(user.token, [rebound])).results[0].errorCode).toBe(
      'INVALID_OP_ID',
    );
    expect(
      await harness.readCaptureReceipt({ ...user, captureId: anotherCaptureId }),
    ).toBeNull();
    const loser = await makeOp(captureId);
    expect((await upload(user.token, [loser])).results[0].errorCode).toBe(
      'CAPTURE_ALREADY_CONSUMED',
    );
    expect(await prisma.operation.count({ where: { userId: user.userId } })).toBe(0);
  });

  it('rolls back op, receipt, sequence and storage when receipt transaction fails', async () => {
    dispose = harness.install();
    const user = await createUser();
    const captureId = unique();
    await harness.enqueueCapture({ ...user, captureId, title: 'Rollback' });
    const op = await makeOp(captureId);
    failAfterReceipt = true;
    const failed = await upload(user.token, [op]);
    expect(failed.results[0].accepted).toBe(false);
    expect(await harness.readCaptureReceipt({ ...user, captureId })).toBeNull();
    expect(await prisma.operation.count({ where: { userId: user.userId } })).toBe(0);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: user.userId } }))
        .storageUsedBytes,
    ).toBe(0n);
    expect(
      (await prisma.userSyncState.findUnique({ where: { userId: user.userId } }))
        ?.lastSeq ?? 0,
    ).toBe(0);
    failAfterReceipt = false;
    expect((await upload(user.token, [op])).results[0].accepted).toBe(true);
  });

  it('rejects malformed capture siblings individually and never consumes them', async () => {
    dispose = harness.install();
    const user = await createUser();
    const clientId = unique();
    const ids = Array.from({ length: 5 }, unique);
    for (const captureId of ids)
      await harness.enqueueCapture({ ...user, captureId, title: 'Batch' });
    const ops = await Promise.all(ids.map((id) => makeOp(id, clientId)));
    ops[0].opType = 'UPD';
    ops[1].entityType = 'PROJECT';
    ops[2].entityId = 'wrong-task';
    ops[3].clientId = 'mismatched-request-client';
    const result = await upload(user.token, ops, true);
    expect(result.results.map((item) => item.accepted)).toEqual([
      false,
      false,
      false,
      false,
      true,
    ]);
    for (const captureId of ids.slice(0, 4)) {
      expect(await harness.readCaptureReceipt({ ...user, captureId })).toBeNull();
    }
    expect(
      await harness.readCaptureReceipt({ ...user, captureId: ids[4] }),
    ).not.toBeNull();
  });

  it('does not bind an occupied operation or a capture belonging to another account', async () => {
    dispose = harness.install();
    const user = await createUser();
    const other = await createUser();
    const captureId = unique();
    await harness.enqueueCapture({ ...user, captureId, title: 'Account-bound capture' });
    const op = await makeOp(captureId);
    expect((await upload(other.token, [op])).results[0].accepted).toBe(false);
    const ordinary = { ...op, captureId: undefined };
    expect((await upload(user.token, [ordinary])).results[0].accepted).toBe(true);
    expect((await upload(user.token, [op])).results[0].accepted).toBe(false);
    expect(await harness.readCaptureReceipt({ ...user, captureId })).toBeNull();
  });

  it('serializes simultaneous device uploads into one durable receipt', async () => {
    dispose = harness.install();
    const user = await createUser();
    const captureId = unique();
    await harness.enqueueCapture({ ...user, captureId, title: 'Race' });
    const ops = await Promise.all([makeOp(captureId), makeOp(captureId)]);
    const results = await Promise.all(ops.map((op) => upload(user.token, [op])));
    expect(results.filter((result) => result.results[0].accepted)).toHaveLength(1);
    const loserIndex = results.findIndex((result) => !result.results[0].accepted);
    const retry = await upload(user.token, [ops[loserIndex]]);
    expect(retry.results[0].errorCode).toBe('CAPTURE_ALREADY_CONSUMED');
    expect(await prisma.operation.count({ where: { userId: user.userId } })).toBe(1);
    expect(await harness.readCaptureReceipt({ ...user, captureId })).not.toBeNull();
  });
});

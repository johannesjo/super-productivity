/**
 * PostgreSQL feasibility coverage for the publication-first agent-capture
 * candidate. The queue tables are test-only raw SQL owned by the harness; task
 * operations are accepted by the ordinary SyncService upload path.
 *
 * Requires DATABASE_URL and the SuperSync schema, for example the isolated
 * capture spike database provisioned for this experiment.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { prisma, disconnectDb } from '../../src/db';
import { SyncService } from '../../src/sync/sync.service';
import { Operation } from '../../src/sync/sync.types';
import {
  createAgentCapturePublicationHarness,
  getAgentCaptureActorId,
} from './agent-capture-publication.harness';

const DATABASE_URL = process.env.DATABASE_URL;
const describeWithDb = DATABASE_URL ? describe : describe.skip;
const RUN_ID = `${Date.now()}-${process.pid}`;

describeWithDb('Agent capture publication spike (PostgreSQL)', () => {
  const userIds: number[] = [];
  let counter = 0;
  const harness = createAgentCapturePublicationHarness(prisma);

  const unique = (prefix: string): string => `${prefix}-${RUN_ID}-${++counter}`;

  const createUser = async (): Promise<number> => {
    const user = await prisma.user.create({
      data: { email: `${unique('agent-capture')}@test.local`, isVerified: 1 },
    });
    userIds.push(user.id);
    return user.id;
  };

  const makeTaskCandidate = (
    userId: number,
    watermark: number,
    overrides: Partial<Operation> = {},
  ): Operation => {
    const actor = getAgentCaptureActorId(userId);
    const taskId = unique('capture-task');
    return {
      id: unique('capture-op'),
      clientId: actor,
      actionType: '[Task] Add',
      opType: 'CRT',
      entityType: 'TASK',
      entityId: taskId,
      // The app/Playwright fixture supplies the real task action payload in the
      // end-to-end test. This SQL suite only needs a valid opaque task envelope.
      payload: { actionPayload: { task: { id: taskId, title: 'Captured task' } } },
      vectorClock: { [actor]: watermark + 1 },
      timestamp: Date.now(),
      schemaVersion: 1,
      ...overrides,
    };
  };

  const publish = async (
    userId: number,
    captureId: string,
    candidate: Operation,
    watermark: number,
    lastKnownServerSeq: number = 0,
  ) =>
    harness.publishCapture({
      userId,
      captureId,
      candidate,
      expectedCaptureCounter: watermark,
      lastKnownServerSeq,
    });

  beforeAll(async () => {
    await harness.initialize();
  });

  afterEach(async () => {
    await harness.removeCaptureRowsForUsers({ userIds });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    userIds.length = 0;
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('recovers one terminal receipt after a lost response and a new helper instance', async () => {
    const userId = await createUser();
    const captureId = unique('lost-response');
    await harness.enqueueCapture({ userId, captureId, title: 'Capture once' });
    const candidate = makeTaskCandidate(userId, 0);

    const first = await publish(userId, captureId, candidate, 0);
    expect(first.status).toBe('published');
    if (first.status === 'rejected') throw new Error(first.error);

    // A new instance reads the persisted receipt; it does not rely on memory
    // retained by the publisher that lost its response.
    const restarted = createAgentCapturePublicationHarness(prisma);
    const retry = await restarted.publishCapture({
      userId,
      captureId,
      candidate,
      expectedCaptureCounter: 0,
      lastKnownServerSeq: 0,
    });
    expect(retry).toEqual({ status: 'already_published', receipt: first.receipt });
    expect(await restarted.countCaptureActorOperations({ userId })).toBe(1);
  });

  it('serializes competing candidates for one capture to one canonical operation', async () => {
    const userId = await createUser();
    const captureId = unique('same-capture');
    await harness.enqueueCapture({ userId, captureId, title: 'Competing candidates' });
    const candidateA = makeTaskCandidate(userId, 0);
    const candidateB = makeTaskCandidate(userId, 0);

    const [first, second] = await Promise.all([
      publish(userId, captureId, candidateA, 0),
      publish(userId, captureId, candidateB, 0),
    ]);
    expect([first.status, second.status].sort()).toEqual([
      'already_published',
      'published',
    ]);
    if (first.status === 'rejected' || second.status === 'rejected') {
      throw new Error(
        'Competing capture candidate was rejected instead of receiving a receipt',
      );
    }
    expect(first.receipt).toEqual(second.receipt);
    expect(await harness.countCaptureActorOperations({ userId })).toBe(1);
  });

  it('rejects a different queue candidate whose publication watermark became stale', async () => {
    const userId = await createUser();
    const captureA = unique('first-capture');
    const captureB = unique('stale-capture');
    await Promise.all([
      harness.enqueueCapture({ userId, captureId: captureA, title: 'First' }),
      harness.enqueueCapture({ userId, captureId: captureB, title: 'Second' }),
    ]);

    expect(
      (await publish(userId, captureA, makeTaskCandidate(userId, 0), 0)).status,
    ).toBe('published');
    const stale = await publish(userId, captureB, makeTaskCandidate(userId, 0), 0);
    expect(stale).toMatchObject({
      status: 'rejected',
      error: expect.stringContaining('stale'),
    });
    expect(
      await harness.readPendingCapture({ userId, captureId: captureB }),
    ).not.toBeNull();
    expect(await harness.readPublicationWatermark({ userId })).toBe(1);
  });

  it('rolls back failures both before receipt persistence and before commit', async () => {
    const userId = await createUser();
    const captureId = unique('rollback');
    await harness.enqueueCapture({ userId, captureId, title: 'Rollback' });
    const candidate = makeTaskCandidate(userId, 0);
    const beforeReceiptHarness = createAgentCapturePublicationHarness(prisma, {
      afterOperationAccepted: () => {
        throw new Error('injected failure after operation insert');
      },
    });
    expect(
      await beforeReceiptHarness.publishCapture({
        userId,
        captureId,
        candidate,
        expectedCaptureCounter: 0,
        lastKnownServerSeq: 0,
      }),
    ).toMatchObject({ status: 'rejected' });
    expect(await harness.readCaptureReceipt({ userId, captureId })).toBeNull();
    expect(await harness.countCaptureActorOperations({ userId })).toBe(0);

    const beforeCommitHarness = createAgentCapturePublicationHarness(prisma, {
      beforeTransactionCommit: () => {
        throw new Error('injected failure after receipt write');
      },
    });

    const result = await beforeCommitHarness.publishCapture({
      userId,
      captureId,
      candidate,
      expectedCaptureCounter: 0,
      lastKnownServerSeq: 0,
    });
    expect(result.status).toBe('rejected');
    expect(await harness.readCaptureReceipt({ userId, captureId })).toBeNull();
    expect(await harness.countCaptureActorOperations({ userId })).toBe(0);
    expect(await harness.readPublicationWatermark({ userId })).toBe(0);
  });

  it('returns no receipt for a capture ID that was never queued', async () => {
    const userId = await createUser();

    await expect(
      harness.readCaptureReceipt({ userId, captureId: unique('missing-capture') }),
    ).resolves.toBeNull();
  });

  it('uses the normal stale-cursor fence before publishing a candidate prepared before an import', async () => {
    const userId = await createUser();
    const importer = 'importer';
    const importResult = await new SyncService().uploadOps(
      userId,
      importer,
      [
        {
          id: unique('import-op'),
          clientId: importer,
          actionType: '[SP_ALL] Load(import) all data',
          opType: 'SYNC_IMPORT',
          entityType: 'ALL',
          payload: { appDataComplete: { TASK: {} } },
          vectorClock: { [importer]: 1 },
          timestamp: Date.now(),
          schemaVersion: 1,
          syncImportReason: 'FORCE_UPLOAD',
        },
      ],
      true,
      undefined,
      undefined,
      false,
      0,
    );
    expect(importResult[0]?.accepted).toBe(true);
    const captureId = unique('pre-import');
    await harness.enqueueCapture({ userId, captureId, title: 'Prepared too early' });

    const result = await publish(userId, captureId, makeTaskCandidate(userId, 0), 0, 0);
    expect(result).toMatchObject({
      status: 'rejected',
      error: 'Download the latest full-state replacement before retrying',
    });
    expect(await harness.readCaptureReceipt({ userId, captureId })).toBeNull();
  });

  it.each([false, true])(
    'refuses stale clock with fresh import cursor, then accepts a rebuilt candidate (pruning=%s)',
    async (oversizedClock) => {
      const userId = await createUser();
      const captureId = unique('stale-clock-fresh-cursor');
      await harness.enqueueCapture({
        userId,
        captureId,
        title: 'Prepared before restore',
      });
      const candidate = makeTaskCandidate(userId, 0);
      const importer = 'causal-restore-device';
      const importClock = {
        ...(oversizedClock
          ? Object.fromEntries(
              Array.from({ length: 30 }, (_, i) => [`old-client-${i}`, 100 + i]),
            )
          : {}),
        [importer]: 1,
      };
      const importOp: Operation = {
        id: unique('causal-import'),
        clientId: importer,
        actionType: '[SP_ALL] Load(import) all data',
        opType: 'SYNC_IMPORT',
        entityType: 'ALL',
        payload: { appDataComplete: { TASK: {} } },
        vectorClock: importClock,
        timestamp: Date.now(),
        schemaVersion: 1,
        syncImportReason: 'BACKUP_RESTORE',
      };
      const result = await new SyncService().uploadOps(
        userId,
        importer,
        [importOp],
        true,
        undefined,
        undefined,
        false,
        0,
      );
      expect(result[0]?.accepted).toBe(true);
      const cursor = result[0].serverSeq!;
      const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

      expect(await publish(userId, captureId, candidate, 0, cursor)).toMatchObject({
        status: 'rejected',
        error: 'Capture candidate does not include the latest state replacement',
      });
      expect(await harness.readCaptureReceipt({ userId, captureId })).toBeNull();
      expect(await harness.readPublicationWatermark({ userId })).toBe(0);
      expect(await harness.countCaptureActorOperations({ userId })).toBe(0);
      expect(
        (await prisma.userSyncState.findUniqueOrThrow({ where: { userId } })).lastSeq,
      ).toBe(cursor);
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).storageUsedBytes,
      ).toBe(before.storageUsedBytes);

      const rebuilt = {
        ...candidate,
        vectorClock: { ...candidate.vectorClock, ...importClock },
      };
      const published = await publish(userId, captureId, rebuilt, 0, cursor);
      expect(published.status).toBe('published');
      if (published.status === 'rejected') throw new Error(published.error);
      const stored = await prisma.operation.findUniqueOrThrow({
        where: { id: published.receipt.opId },
        select: { vectorClock: true },
      });
      expect(Object.keys(stored.vectorClock as object)).toHaveLength(
        oversizedClock ? 20 : 2,
      );
      expect(stored.vectorClock).toMatchObject({
        [importer]: 1,
        [getAgentCaptureActorId(userId)]: 1,
      });
    },
  );

  /**
   * The retention gate. `latestStateReplacementSeq` tracks imports only, while
   * the retention sweep's boundary is the newest CAUSAL full-state op, which
   * also counts a causal REPAIR. A REPAIR newer than the newest import
   * therefore authorizes deleting that import's row, and nothing rewrites the
   * pointer — `resolveRetainedReplacementSeq` exists precisely because pruning
   * deletes import rows, but it is consulted only for unresolved upgrade rows.
   *
   * The ordinary upload fence is unharmed: it compares the pointer as a number
   * and never joins the row. Publication does join it, for the clientId and
   * vector clock the import classifier needs, so a dangling pointer refuses
   * every future capture for that account. That is an availability failure, not
   * a safety failure: this asserts both that nothing publishes AND that the
   * capture survives pending rather than being consumed.
   */
  it('refuses every capture forever once the replacement row has been pruned', async () => {
    const userId = await createUser();
    const importer = 'pruned-importer';
    const importClock = { [importer]: 1 };
    const importResult = await new SyncService().uploadOps(
      userId,
      importer,
      [
        {
          id: unique('pruned-import'),
          clientId: importer,
          actionType: '[SP_ALL] Load(import) all data',
          opType: 'SYNC_IMPORT',
          entityType: 'ALL',
          payload: { appDataComplete: { TASK: {} } },
          vectorClock: importClock,
          timestamp: Date.now(),
          schemaVersion: 1,
          syncImportReason: 'BACKUP_RESTORE',
        },
      ],
      true,
      undefined,
      undefined,
      false,
      0,
    );
    expect(importResult[0]?.accepted).toBe(true);
    const importSeq = importResult[0].serverSeq!;

    // A causal REPAIR above the import. It deliberately does not move the
    // replacement pointer, but it does raise the retention boundary above it.
    const repairer = 'repair-device';
    const repairResult = await new SyncService().uploadOps(
      userId,
      repairer,
      [
        {
          id: unique('causal-repair'),
          clientId: repairer,
          actionType: '[Repair] Auto Repair',
          opType: 'REPAIR',
          entityType: 'ALL',
          payload: { appDataComplete: { TASK: {} } },
          vectorClock: { ...importClock, [repairer]: 1 },
          timestamp: Date.now(),
          schemaVersion: 1,
          repairBaseServerSeq: importSeq,
        },
      ],
      false,
      undefined,
      importSeq,
      false,
      importSeq,
    );
    expect(repairResult[0]?.accepted).toBe(true);
    const repairSeq = repairResult[0].serverSeq!;

    // What the retention sweep does: delete below the newest causal full-state
    // op. The import row goes; the pointer to it stays.
    await prisma.operation.deleteMany({
      where: { userId, serverSeq: { lt: repairSeq } },
    });
    const syncState = await prisma.userSyncState.findUniqueOrThrow({
      where: { userId },
      select: { latestStateReplacementSeq: true },
    });
    expect(syncState.latestStateReplacementSeq).toBe(importSeq);
    expect(
      await prisma.operation.findUnique({
        where: { userId_serverSeq: { userId, serverSeq: importSeq } },
      }),
    ).toBeNull();

    // A candidate that correctly descends from the import — it would publish if
    // the boundary were still readable.
    const captureId = unique('pruned-replacement');
    await harness.enqueueCapture({ userId, captureId, title: 'Blocked by retention' });
    const candidate = makeTaskCandidate(userId, 0);
    candidate.vectorClock = { ...candidate.vectorClock, ...importClock };

    const rejection = {
      status: 'rejected',
      error: 'Capture state replacement is no longer retained',
    };
    expect(await publish(userId, captureId, candidate, 0, repairSeq)).toMatchObject(
      rejection,
    );
    // Permanent, not transient: nothing about the account will restore the row.
    expect(await publish(userId, captureId, candidate, 0, repairSeq)).toMatchObject(
      rejection,
    );

    // Safe but unavailable: no operation, no receipt, capture still pending.
    expect(await harness.countCaptureActorOperations({ userId })).toBe(0);
    expect(await harness.readCaptureReceipt({ userId, captureId })).toBeNull();
    expect(await harness.readPublicationWatermark({ userId })).toBe(0);
    expect(await harness.readPendingCapture({ userId, captureId })).toMatchObject({
      captureId,
      title: 'Blocked by retention',
    });
  });

  it('keeps the terminal receipt after delete, import, and operation removal', async () => {
    const userId = await createUser();
    const captureId = unique('terminal');
    await harness.enqueueCapture({ userId, captureId, title: 'Terminal after import' });
    const candidate = makeTaskCandidate(userId, 0);
    const published = await publish(userId, captureId, candidate, 0);
    expect(published.status).toBe('published');
    if (published.status === 'rejected') throw new Error(published.error);

    const editor = 'ordinary-device';
    const deleteResult = await new SyncService().uploadOps(
      userId,
      editor,
      [
        {
          ...candidate,
          id: unique('delete-op'),
          clientId: editor,
          actionType: '[Task] Delete',
          opType: 'DEL',
          payload: { actionPayload: { task: { id: candidate.entityId } } },
          vectorClock: { [getAgentCaptureActorId(userId)]: 1, [editor]: 1 },
        },
      ],
      undefined,
      undefined,
      undefined,
      false,
      published.receipt.serverSeq,
    );
    expect(deleteResult[0]?.accepted).toBe(true);

    const importClient = 'restore-device';
    const replacementResult = await new SyncService().uploadOps(
      userId,
      importClient,
      [
        {
          id: unique('post-publish-import'),
          clientId: importClient,
          actionType: '[SP_ALL] Load(import) all data',
          opType: 'SYNC_IMPORT',
          entityType: 'ALL',
          payload: { appDataComplete: { TASK: {} } },
          vectorClock: {
            [getAgentCaptureActorId(userId)]: 1,
            [editor]: 1,
            [importClient]: 1,
          },
          timestamp: Date.now(),
          schemaVersion: 1,
          syncImportReason: 'FORCE_UPLOAD',
        },
      ],
      true,
      undefined,
      undefined,
      false,
      published.receipt.serverSeq + 1,
    );
    expect(replacementResult[0]?.accepted).toBe(true);
    expect(
      await prisma.operation.findUnique({ where: { id: published.receipt.opId } }),
    ).toBeNull();

    const restarted = createAgentCapturePublicationHarness(prisma);
    expect(await restarted.readCaptureReceipt({ userId, captureId })).toEqual(
      published.receipt,
    );
    expect(
      await restarted.publishCapture({
        userId,
        captureId,
        candidate,
        expectedCaptureCounter: 0,
        lastKnownServerSeq: 0,
      }),
    ).toEqual({ status: 'already_published', receipt: published.receipt });
  });
});

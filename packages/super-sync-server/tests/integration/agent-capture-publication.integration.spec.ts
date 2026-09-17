/**
 * PostgreSQL feasibility coverage for the publication-first agent-capture
 * candidate. The queue tables are test-only raw SQL owned by the harness; task
 * operations are accepted by the ordinary SyncService upload path.
 *
 * Requires DATABASE_URL and the SuperSync schema, for example the isolated
 * capture spike database provisioned for this experiment.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
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
    /** Defaults to 0: a fresh account has never been wiped. */
    expectedDataGeneration: number = 0,
  ) =>
    harness.publishCapture({
      userId,
      captureId,
      candidate,
      expectedCaptureCounter: watermark,
      lastKnownServerSeq,
      expectedDataGeneration,
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
      expectedDataGeneration: 0,
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
        expectedDataGeneration: 0,
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
      expectedDataGeneration: 0,
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
   * and never joins the row. Publication needs the boundary's clientId and
   * vector clock, which used to come from that row alone — so a pruned import
   * refused every future capture for the account. `uploadOps` now records the
   * accepted import's causal identity beside the seq, so the boundary outlives
   * its row. This asserts the recovered availability AND that the boundary is
   * still enforced: a candidate that does not descend from the pruned import is
   * still rejected.
   */
  it('still classifies against the replacement once its row has been pruned', async () => {
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
      select: {
        latestStateReplacementSeq: true,
        latestStateReplacementClientId: true,
        latestStateReplacementVectorClock: true,
      },
    });
    expect(syncState.latestStateReplacementSeq).toBe(importSeq);
    expect(
      await prisma.operation.findUnique({
        where: { userId_serverSeq: { userId, serverSeq: importSeq } },
      }),
    ).toBeNull();
    // The evidence the upload recorded beside the seq is what survives.
    expect(syncState.latestStateReplacementClientId).toBe(importer);
    expect(syncState.latestStateReplacementVectorClock).toEqual(importClock);

    // A candidate that does NOT descend from the import must still be refused:
    // recovering availability must not turn the pruned boundary into no
    // boundary. Rejected by classification, not by a missing row.
    const staleCaptureId = unique('pruned-stale');
    await harness.enqueueCapture({
      userId,
      captureId: staleCaptureId,
      title: 'Prepared before the import',
    });
    expect(
      await publish(userId, staleCaptureId, makeTaskCandidate(userId, 0), 0, repairSeq),
    ).toMatchObject({
      status: 'rejected',
      error: 'Capture candidate does not include the latest state replacement',
    });

    // A candidate that correctly descends from the import now publishes.
    const captureId = unique('pruned-replacement');
    await harness.enqueueCapture({ userId, captureId, title: 'Survives retention' });
    const candidate = makeTaskCandidate(userId, 0);
    candidate.vectorClock = { ...candidate.vectorClock, ...importClock };

    expect(await publish(userId, captureId, candidate, 0, repairSeq)).toMatchObject({
      status: 'published',
    });
    expect(await harness.countCaptureActorOperations({ userId })).toBe(1);
    expect(await harness.readCaptureReceipt({ userId, captureId })).not.toBeNull();
  });

  /**
   * The residual gap, pinned rather than papered over: an account whose import
   * was accepted before the evidence columns existed, and whose row was pruned
   * before any later upload could backfill them, has no causal identity for its
   * boundary anywhere. Publication must keep refusing. Treating the missing
   * boundary as an absent one would publish work prepared before the import —
   * exactly the safety failure the gate exists for.
   */
  it('refuses when neither the row nor the recorded evidence has the boundary', async () => {
    const userId = await createUser();
    const importer = 'legacy-importer';
    const importClock = { [importer]: 1 };
    const importResult = await new SyncService().uploadOps(
      userId,
      importer,
      [
        {
          id: unique('legacy-import'),
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

    // A row as it existed before this migration: seq only, no evidence.
    await prisma.userSyncState.update({
      where: { userId },
      data: {
        latestStateReplacementClientId: null,
        latestStateReplacementVectorClock: Prisma.DbNull,
      },
    });
    await prisma.operation.deleteMany({
      where: { userId, serverSeq: { lte: importSeq } },
    });

    const captureId = unique('legacy-pruned');
    await harness.enqueueCapture({ userId, captureId, title: 'No evidence anywhere' });
    const candidate = makeTaskCandidate(userId, 0);
    candidate.vectorClock = { ...candidate.vectorClock, ...importClock };

    expect(await publish(userId, captureId, candidate, 0, importSeq)).toMatchObject({
      status: 'rejected',
      error: 'Capture state replacement is no longer retained',
    });
    expect(await harness.countCaptureActorOperations({ userId })).toBe(0);
    expect(await harness.readPendingCapture({ userId, captureId })).toMatchObject({
      captureId,
      title: 'No evidence anywhere',
    });
  });

  /**
   * Step 3, account/encryption binding. A prepared candidate carries ciphertext
   * produced with the key that was active at preparation time. Enabling
   * encryption, disabling it, and importing data whose encryption settings
   * differ all run `SnapshotUploadService.deleteAndReuploadWithNewEncryption`:
   * `DELETE /api/sync/data` — that is `deleteAllUserData`, which drops every
   * operation and the whole `user_sync_state` ROW — and only then a full-state
   * re-upload under the NEW key. A password change does NOT take this route: it
   * uses the clean-slate upload path, which keeps the row and writes a real
   * SYNC_IMPORT, so the existing replacement fence already covers it.
   *
   * This case is the WINDOW between the delete and the re-upload. There the
   * account has no operations, no sync state and no replacement boundary, so
   * every existing fence is vacuous — not stale, absent. The window is not
   * brief: the toggle deliberately keeps the new key config when the upload
   * fails, leaving the server empty until the user retries.
   *
   * The damage is not a wrong task. An operation encrypted under a retired key
   * cannot be decrypted by any device, and
   * `OperationLogDownloadService` rethrows `OperationDecryptionError` for the
   * whole page rather than skipping the item — so one poison operation wedges
   * downloads for every device on the account, at a fixed seq, permanently.
   */
  it('refuses a candidate prepared under a wiped encryption context', async () => {
    const userId = await createUser();
    const captureId = unique('stale-key');
    await harness.enqueueCapture({ userId, captureId, title: 'Prepared under old key' });
    // Prepared while the account was on the OLD key: opaque ciphertext the
    // server cannot inspect, and by now cannot be decrypted by anyone.
    const candidate = makeTaskCandidate(userId, 0, {
      isPayloadEncrypted: true,
      payload: 'ciphertext-from-the-retired-key',
    });

    // The wipe half of the encryption toggle, before its re-upload lands.
    await new SyncService().deleteAllUserData(userId);
    expect(await prisma.userSyncState.findUnique({ where: { userId } })).toBeNull();

    const result = await publish(userId, captureId, candidate, 0);

    expect(result).toMatchObject({
      status: 'rejected',
      error: 'Capture was prepared for a superseded account state',
    });
    expect(await harness.countCaptureActorOperations({ userId })).toBe(0);
    expect(await harness.readCaptureReceipt({ userId, captureId })).toBeNull();
    // Still pending, so the assistant's work is not silently lost — it is
    // rebuilt against the current encryption context instead.
    expect(await harness.readPendingCapture({ userId, captureId })).toMatchObject({
      captureId,
    });
  });

  /**
   * Why a monotonic counter and not a reset. The wipe destroys the capture
   * queue, the watermark and the sync state, so a cheaper fix — drop the queue
   * rows and let the assistant re-queue — looks sufficient. It is not: after the
   * wipe the watermark restarts at 0, so a re-queued capture with the SAME id
   * admits the pre-wipe candidate again, ciphertext and all. Only a value that
   * never returns to a previous state distinguishes the two.
   */
  it('refuses the pre-wipe candidate even after the capture is re-queued', async () => {
    const userId = await createUser();
    const captureId = unique('replayed');
    await harness.enqueueCapture({ userId, captureId, title: 'Prepared under old key' });
    const staleCandidate = makeTaskCandidate(userId, 0, {
      isPayloadEncrypted: true,
      payload: 'ciphertext-from-the-retired-key',
    });

    await new SyncService().deleteAllUserData(userId);
    // The assistant re-queues the same capture against the fresh account.
    await harness.enqueueCapture({ userId, captureId, title: 'Prepared under old key' });
    expect(await harness.readPublicationWatermark({ userId })).toBe(0);

    // Watermark, actor identity, op id and (absent) replacement fence all agree
    // with the stale candidate. The generation is the only thing that does not.
    expect(await publish(userId, captureId, staleCandidate, 0)).toMatchObject({
      status: 'rejected',
      error: 'Capture was prepared for a superseded account state',
    });
    expect(await harness.countCaptureActorOperations({ userId })).toBe(0);
  });

  /**
   * The same binding from the other direction: an ordinary capture must still
   * publish after a wipe once it is prepared against the CURRENT generation.
   * Without this, "refuse after a wipe" could be satisfied by refusing forever,
   * which is the availability failure the retention experiment already hit.
   */
  it('publishes a candidate prepared after the wipe', async () => {
    const userId = await createUser();
    await new SyncService().deleteAllUserData(userId);

    const captureId = unique('post-wipe');
    await harness.enqueueCapture({ userId, captureId, title: 'Prepared after wipe' });
    const pending = await harness.readPendingCapture({ userId, captureId });
    expect(pending?.dataGeneration).toBe(1);

    const result = await publish(
      userId,
      captureId,
      makeTaskCandidate(userId, 0),
      0,
      0,
      pending!.dataGeneration,
    );

    expect(result).toMatchObject({ status: 'published' });
    expect(await harness.countCaptureActorOperations({ userId })).toBe(1);
  });

  /**
   * Where the generation fence stops. Once the toggle's re-upload lands, the
   * snapshot handler has stored it as a SYNC_IMPORT through `uploadOps`, which
   * rewrites the replacement pointer — so the ORDINARY fence already refuses the
   * pre-wipe candidate, and it refuses it on causality rather than on the
   * generation. Recorded so the new counter is never credited with work it does
   * not do: it covers the wipe window, not the completed encryption change.
   *
   * The generation is deliberately passed as the CURRENT one, satisfying the new
   * fence, so only the pre-existing fences can decide the outcome.
   */
  it('leaves a completed encryption toggle to the ordinary replacement fence', async () => {
    const userId = await createUser();
    const device = 'toggling-device';
    const actor = getAgentCaptureActorId(userId);
    const syncService = new SyncService();

    // Account history from the device that will toggle encryption.
    const preWipe = await syncService.uploadOps(userId, device, [
      makeTaskCandidate(userId, 0, {
        clientId: device,
        vectorClock: { [device]: 1 },
      }),
    ]);
    const preWipeCursor = preWipe[0].serverSeq!;

    const captureId = unique('completed-toggle');
    await harness.enqueueCapture({ userId, captureId, title: 'Prepared under old key' });
    const staleCandidate = makeTaskCandidate(userId, 0, {
      isPayloadEncrypted: true,
      payload: 'ciphertext-from-the-retired-key',
      vectorClock: { [device]: 1, [actor]: 1 },
    });

    // The whole toggle: wipe, then the full-state re-upload under the new key.
    await syncService.deleteAllUserData(userId);
    const reupload = await syncService.uploadOps(
      userId,
      device,
      [
        {
          id: unique('toggle-import'),
          clientId: device,
          actionType: '[SP_ALL] Load(import) all data',
          opType: 'SYNC_IMPORT',
          entityType: 'ALL',
          payload: 'encrypted-full-state-under-the-new-key',
          isPayloadEncrypted: true,
          vectorClock: { [device]: 2 },
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
    expect(reupload[0]?.accepted).toBe(true);
    const generation = await harness.readDataGeneration({ userId });
    expect(generation).toBe(1);
    expect(
      (await prisma.userSyncState.findUniqueOrThrow({ where: { userId } }))
        .latestStateReplacementSeq,
    ).toBe(reupload[0].serverSeq);

    expect(
      await publish(userId, captureId, staleCandidate, 0, preWipeCursor, generation),
    ).toMatchObject({
      status: 'rejected',
      error: 'Capture candidate does not include the latest state replacement',
    });
    expect(await harness.countCaptureActorOperations({ userId })).toBe(0);
  });

  /**
   * Account binding. The capture actor is derived from the account
   * (`agent-capture-<userId>`), so a candidate prepared for one account cannot
   * be published into another even if both queues hold the same capture id.
   */
  it('refuses a candidate prepared for a different account', async () => {
    const preparedForUserId = await createUser();
    const publishingUserId = await createUser();
    const captureId = unique('cross-account');
    await harness.enqueueCapture({
      userId: publishingUserId,
      captureId,
      title: 'Belongs to another account',
    });

    const foreignCandidate = makeTaskCandidate(preparedForUserId, 0);

    expect(await publish(publishingUserId, captureId, foreignCandidate, 0)).toMatchObject(
      {
        status: 'rejected',
        error: 'Capture candidate has the wrong publisher identity',
      },
    );
    expect(await harness.countCaptureActorOperations({ userId: publishingUserId })).toBe(
      0,
    );
    expect(await harness.countCaptureActorOperations({ userId: preparedForUserId })).toBe(
      0,
    );
  });

  /**
   * Multiple tabs. `SyncCycleGuardService` is an IN-TAB guard, so two tabs can
   * prepare concurrently and both read the same publication watermark. The
   * server is the arbiter: the watermark is claimed inside the publication
   * transaction, so exactly one candidate can occupy each counter value.
   */
  it('accepts exactly one of two candidates prepared at the same watermark', async () => {
    const userId = await createUser();
    const firstCaptureId = unique('tab-a');
    const secondCaptureId = unique('tab-b');
    await harness.enqueueCapture({ userId, captureId: firstCaptureId, title: 'Tab A' });
    await harness.enqueueCapture({ userId, captureId: secondCaptureId, title: 'Tab B' });

    // Both tabs prepared against watermark 0 — neither saw the other.
    const [first, second] = await Promise.all([
      publish(userId, firstCaptureId, makeTaskCandidate(userId, 0), 0),
      publish(userId, secondCaptureId, makeTaskCandidate(userId, 0), 0),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual(['published', 'rejected']);
    expect(await harness.countCaptureActorOperations({ userId })).toBe(1);
    expect(await harness.readPublicationWatermark({ userId })).toBe(1);
    // The loser stays pending and is rebuilt against the new watermark.
    const [winner, loser] =
      first.status === 'rejected'
        ? [secondCaptureId, firstCaptureId]
        : [firstCaptureId, secondCaptureId];
    expect(
      await harness.readCaptureReceipt({ userId, captureId: winner }),
    ).not.toBeNull();
    expect(await harness.readCaptureReceipt({ userId, captureId: loser })).toBeNull();
    expect(await harness.readPendingCapture({ userId, captureId: loser })).not.toBeNull();
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
        expectedDataGeneration: 0,
      }),
    ).toEqual({ status: 'already_published', receipt: published.receipt });
  });
});

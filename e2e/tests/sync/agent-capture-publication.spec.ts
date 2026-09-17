import { expect, test } from '../../fixtures/supersync.fixture';
import { ImportPage } from '../../pages/import.page';
import { SuperSyncPage } from '../../pages/supersync.page';
import { WorkViewPage } from '../../pages/work-view.page';
import {
  closeClient,
  createSimulatedClient,
  createTestUser,
  deleteTask,
  getSuperSyncConfig,
  renameTask,
  waitForTask,
  type SimulatedE2EClient,
} from '../../utils/supersync-helpers';
import { waitForAppReady } from '../../utils/waits';
import { classifyOpAgainstSyncImport } from '@sp/sync-core';
import { PrismaClient } from '@prisma/client';
import type { Operation } from '../../../packages/super-sync-server/src/sync/sync.types';
import {
  createAgentCapturePublicationHarness,
  getAgentCaptureActorId,
  type CapturePublicationHarness,
} from '../../../packages/super-sync-server/tests/integration/agent-capture-publication.harness';

const DATABASE_URL = process.env.DATABASE_URL;
interface PreparedCapture {
  candidate: Operation;
  lastKnownServerSeq: number;
  expectedCaptureCounter: number;
  taskId: string;
}

type PreparedCaptureForPublication = PreparedCapture & {
  expectedDataGeneration: number;
};

const readPreparationPersistence = (
  client: SimulatedE2EClient,
): Promise<{
  clock: Record<string, number>;
  operationIds: string[];
}> =>
  client.page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('SUP_OPS');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const transaction = db.transaction(['ops', 'vector_clock']);
      const entries = transaction.objectStore('ops').getAll();
      const clock = transaction.objectStore('vector_clock').get('current');
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      if (!clock.result?.clock) throw new Error('Expected persisted clock');
      return {
        clock: clock.result.clock as Record<string, number>,
        operationIds: entries.result.map((entry: { op: { id: string } }) => entry.op.id),
      };
    } finally {
      db.close();
    }
  });

const readCursor = (client: SimulatedE2EClient): Promise<number> =>
  client.page.evaluate(() => {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith('super_sync_last_server_seq_'),
    );
    if (keys.length !== 1)
      throw new Error('Expected one account cursor in isolated client');
    const cursor = Number(localStorage.getItem(keys[0]));
    if (!Number.isSafeInteger(cursor) || cursor < 0)
      throw new Error('Invalid durable cursor');
    return cursor;
  });

const readCaptureState = async (
  client: SimulatedE2EClient,
  taskId: string,
): Promise<{ task: Record<string, unknown> | null; projects: string[] }> =>
  client.page.evaluate(async (id) => {
    type State = {
      tasks: { entities: Record<string, Record<string, unknown>> };
      projects: {
        entities: Record<string, { taskIds: string[]; backlogTaskIds: string[] }>;
      };
    };
    const helpers = (
      window as unknown as {
        __e2eTestHelpers?: {
          store: {
            subscribe: (fn: (state: State) => void) => { unsubscribe: () => void };
          };
        };
      }
    ).__e2eTestHelpers;
    if (!helpers?.store) throw new Error('Live store unavailable');
    const state = await new Promise<State>((resolve) => {
      const subscription = helpers.store.subscribe(resolve);
      subscription.unsubscribe();
    });
    if (!state.tasks?.entities || !state.projects?.entities)
      throw new Error('Store not hydrated');
    return {
      task: state.tasks.entities[id] ?? null,
      projects: Object.entries(state.projects.entities).flatMap(([projectId, project]) =>
        ['taskIds', 'backlogTaskIds'].flatMap((key) =>
          (project[key as 'taskIds' | 'backlogTaskIds'] ?? [])
            .filter((value) => value === id)
            .map(() => `${projectId}:${key}`),
        ),
      ),
    };
  }, taskId);

/**
 * Spike shortcut: the account's data generation is read straight from the
 * database at preparation time. A production preparer has no such access — it
 * would have to learn the generation from a sync response, which is an open
 * protocol gate recorded in the Stage A plan. What this DOES exercise is that
 * the value is captured when the candidate is built, not when it is published.
 */
const prepareCapture = async (
  client: SimulatedE2EClient,
  captureId: string,
  title: string,
  publisherClientId: string,
  publisherCounter: number,
  userId: number,
): Promise<PreparedCaptureForPublication> => {
  const expectedDataGeneration = await createAgentCapturePublicationHarness(
    prisma,
  ).readDataGeneration({ userId });
  const taskId = `capture-${captureId}`;
  const persistenceBefore = await readPreparationPersistence(client);
  const cursorBefore = await readCursor(client);
  expect(await readCaptureState(client, taskId)).toEqual({ task: null, projects: [] });
  const prepared = await client.page.evaluate(
    (input) =>
      (
        window as unknown as {
          __e2eTestHelpers: {
            prepareCapturePublication: (value: typeof input) => Promise<PreparedCapture>;
          };
        }
      ).__e2eTestHelpers.prepareCapturePublication(input),
    { captureId, title, publisherClientId, publisherCounter },
  );
  expect(prepared.taskId).toBe(taskId);
  expect(await readCaptureState(client, taskId)).toEqual({ task: null, projects: [] });
  expect(prepared.candidate.isPayloadEncrypted).toBe(true);
  expect(await readPreparationPersistence(client)).toEqual(persistenceBefore);
  expect(await readCursor(client)).toBe(cursorBefore);
  expect(prepared.lastKnownServerSeq).toBe(cursorBefore);
  return { ...prepared, expectedDataGeneration };
};

const importBackupAndSync = async (
  client: SimulatedE2EClient,
  syncConfig: ReturnType<typeof getSuperSyncConfig>,
  testRunId: string,
): Promise<void> => {
  const importPage = new ImportPage(client.page);
  await importPage.navigateToImportPage();
  await importPage.importBackupFile(ImportPage.getFixturePath('test-backup.json'));

  // Restart Angular in the same browser context while preserving IndexedDB.
  await client.page.goto('/', { waitUntil: 'commit', timeout: 30000 });
  client.workView = new WorkViewPage(client.page, `${client.clientName}-${testRunId}`);
  client.sync = new SuperSyncPage(client.page);
  await waitForAppReady(client.page, { ensureRoute: false });
  await client.sync.setupSuperSync({ ...syncConfig, waitForInitialSync: false });

  const syncResult = await Promise.race([
    client.sync.syncImportConflictDialog
      .waitFor({ state: 'visible', timeout: 30000 })
      .then(() => 'dialog' as const),
    client.sync.syncCheckIcon
      .waitFor({ state: 'visible', timeout: 30000 })
      .then(() => 'complete' as const),
  ]);
  if (syncResult === 'dialog') {
    await client.sync.chooseSyncImportUseLocal();
  }
  await client.sync.syncAndWait();
};

test.describe('@supersync Agent-capture publication feasibility', () => {
  test.skip(!DATABASE_URL, 'requires the isolated SuperSync PostgreSQL DATABASE_URL');

  test('publishes an encrypted capture once after a lost response and never recreates a deleted task', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    test.setTimeout(240000);
    const appUrl = baseURL || 'http://localhost:4242';
    const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    const harness: CapturePublicationHarness =
      createAgentCapturePublicationHarness(prisma);
    let clientA: SimulatedE2EClient | null = null;
    let clientB: SimulatedE2EClient | null = null;
    const title = `Agent capture ${testRunId}`;

    try {
      await prisma.$connect();
      await harness.initialize();
      const user = await createTestUser(`${testRunId}-capture-publication`);
      const syncConfig = getSuperSyncConfig(user);
      const captureId = `capture-${testRunId}`;
      const captureActorId = getAgentCaptureActorId(user.userId);

      clientA = await createSimulatedClient(browser, appUrl, 'Capture-A', testRunId);
      await clientA.sync.setupSuperSync(syncConfig);
      clientB = await createSimulatedClient(browser, appUrl, 'Capture-B', testRunId);
      await clientB.sync.setupSuperSync(syncConfig);
      await clientA.sync.syncAndWait();
      await clientB.sync.syncAndWait();

      const pending = await harness.enqueueCapture({
        userId: user.userId,
        captureId,
        title,
      });
      const watermark = await harness.readPublicationWatermark({ userId: user.userId });
      expect(pending.captureCounter).toBe(watermark);

      const [preparedA, preparedB] = await Promise.all([
        prepareCapture(clientA, captureId, title, captureActorId, watermark, user.userId),
        prepareCapture(clientB, captureId, title, captureActorId, watermark, user.userId),
      ]);
      // Competing independently prepared tasks have never entered either store.
      // Ignore both commit responses, then recover via the durable receipt.
      await Promise.all([
        harness.publishCapture({ userId: user.userId, captureId, ...preparedA }),
        harness.publishCapture({ userId: user.userId, captureId, ...preparedB }),
      ]);

      const receipt = await harness.readCaptureReceipt({
        userId: user.userId,
        captureId,
      });
      expect(receipt).not.toBeNull();
      expect(await harness.countPublishedCaptures({ userId: user.userId })).toBe(1);
      expect(await harness.countCaptureActorOperations({ userId: user.userId })).toBe(1);
      const storedOperation = await prisma.operation.findUnique({
        where: { id: receipt!.opId },
        select: { isPayloadEncrypted: true, payload: true },
      });
      expect(storedOperation?.isPayloadEncrypted).toBe(true);
      expect(typeof storedOperation?.payload).toBe('string');
      expect(JSON.stringify(storedOperation?.payload)).not.toContain(title);

      // A normal edit/upload of the delivered task occurs before app restart and
      // receipt retry. The retry must not overwrite that later user change.
      await clientA.sync.syncAndWait();
      await clientB.sync.syncAndWait();
      expect(await readCaptureState(clientA, preparedA.taskId)).toEqual(
        await readCaptureState(clientB, preparedA.taskId),
      );
      expect(await readCursor(clientA)).toBeGreaterThanOrEqual(receipt!.serverSeq);
      expect(await readCursor(clientB)).toBeGreaterThanOrEqual(receipt!.serverSeq);
      expect((await readCaptureState(clientA, preparedA.taskId)).task?.title).toBe(title);
      await Promise.all([
        clientA.page.goto('/#/project/INBOX_PROJECT/tasks'),
        clientB.page.goto('/#/project/INBOX_PROJECT/tasks'),
      ]);
      await waitForTask(clientA.page, title);
      const editedTitle = `${title} after local edit`;
      await renameTask(clientA, title, editedTitle);
      await clientA.sync.syncAndWait();
      await clientA.page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await waitForAppReady(clientA.page);

      const restartedHarness = createAgentCapturePublicationHarness(prisma);
      const retry = await restartedHarness.publishCapture({
        userId: user.userId,
        captureId,
        ...preparedB,
      });
      expect(retry.status).toBe('already_published');
      expect(
        await restartedHarness.countCaptureActorOperations({ userId: user.userId }),
      ).toBe(1);

      await clientA.sync.syncAndWait();
      await clientB.sync.syncAndWait();
      await Promise.all([
        waitForTask(clientA.page, editedTitle),
        waitForTask(clientB.page, editedTitle),
      ]);
      await expect(clientA.page.locator('task', { hasText: editedTitle })).toHaveCount(1);
      await expect(clientB.page.locator('task', { hasText: editedTitle })).toHaveCount(1);

      await deleteTask(clientA, editedTitle);
      await clientA.sync.syncAndWait();
      await clientB.sync.syncAndWait();
      await expect(clientA.page.locator('task', { hasText: editedTitle })).toHaveCount(0);
      await expect(clientB.page.locator('task', { hasText: editedTitle })).toHaveCount(0);
      await expect(clientA.page.locator('task', { hasText: title })).toHaveCount(0);
      await expect(clientB.page.locator('task', { hasText: title })).toHaveCount(0);
      expect(await readCaptureState(clientA, preparedA.taskId)).toEqual({
        task: null,
        projects: [],
      });
      expect(await readCaptureState(clientB, preparedA.taskId)).toEqual({
        task: null,
        projects: [],
      });

      const lateRetry = await restartedHarness.publishCapture({
        userId: user.userId,
        captureId,
        ...preparedA,
      });
      expect(lateRetry.status).toBe('already_published');
      await clientA.sync.syncAndWait();
      await clientB.sync.syncAndWait();
      // The original title also matches the edited title and catches a replay
      // that resurrects the task with its original contents.
      await expect(clientA.page.locator('task', { hasText: title })).toHaveCount(0);
      await expect(clientB.page.locator('task', { hasText: title })).toHaveCount(0);
    } finally {
      if (clientA) await closeClient(clientA);
      if (clientB) await closeClient(clientB);
      await prisma.$disconnect();
    }
  });

  for (const useImportingDevice of [true, false]) {
    test(
      useImportingDevice
        ? 'delivers capture prepared by the importing device despite its stale cached clock'
        : 'records backup imports before and after publication from a synchronized second device',
      async ({ browser, baseURL, testRunId }) => {
        test.setTimeout(240000);
        const appUrl = baseURL || 'http://localhost:4242';
        const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
        const harness = createAgentCapturePublicationHarness(prisma);
        let clientA: SimulatedE2EClient | null = null;
        let clientB: SimulatedE2EClient | null = null;
        const title = `Capture around restore ${testRunId}`;

        try {
          await prisma.$connect();
          await harness.initialize();
          const user = await createTestUser(`${testRunId}-capture-restore`);
          const syncConfig = getSuperSyncConfig(user);
          const captureId = `capture-restore-${testRunId}`;
          const captureActorId = getAgentCaptureActorId(user.userId);

          clientA = await createSimulatedClient(browser, appUrl, 'Restore-A', testRunId);
          await clientA.sync.setupSuperSync(syncConfig);
          clientB = await createSimulatedClient(browser, appUrl, 'Restore-B', testRunId);
          await clientB.sync.setupSuperSync(syncConfig);
          await clientA.sync.syncAndWait();
          await clientB.sync.syncAndWait();

          await harness.enqueueCapture({ userId: user.userId, captureId, title });
          const stalePreparation = await prepareCapture(
            clientA,
            captureId,
            title,
            captureActorId,
            0,
            user.userId,
          );

          // Genuine app backup import before candidate preparation establishes the
          // replacement baseline; no fabricated server state is used.
          await importBackupAndSync(clientA, syncConfig, testRunId);
          await clientB.sync.syncAndWait();

          const watermark = await harness.readPublicationWatermark({
            userId: user.userId,
          });
          expect(
            await harness.readPendingCapture({ userId: user.userId, captureId }),
          ).not.toBeNull();
          const consumer = useImportingDevice ? clientA : clientB;
          const prepared = await prepareCapture(
            consumer,
            captureId,
            title,
            captureActorId,
            watermark,
            user.userId,
          );
          const { candidate } = prepared;
          // An import between preparation and submission rejects the immutable
          // old cursor. Even substituting a new cursor cannot bless its old clock.
          for (const lastKnownServerSeq of [
            stalePreparation.lastKnownServerSeq,
            prepared.lastKnownServerSeq,
          ]) {
            const staleResult = await harness.publishCapture({
              userId: user.userId,
              captureId,
              ...stalePreparation,
              lastKnownServerSeq,
            });
            expect(staleResult.status).toBe('rejected');
            expect(
              await harness.readCaptureReceipt({ userId: user.userId, captureId }),
            ).toBeNull();
            expect(
              await harness.countCaptureActorOperations({ userId: user.userId }),
            ).toBe(0);
          }
          // This reads the server only to verify the experiment. Candidate preparation
          // must use the chosen device's own knowledge, never a fabricated server clock.
          const replacement = await prisma.operation.findFirstOrThrow({
            where: { userId: user.userId, opType: 'SYNC_IMPORT' },
            orderBy: { serverSeq: 'desc' },
            select: { clientId: true, vectorClock: true },
          });
          const replayDecision = classifyOpAgainstSyncImport(candidate, {
            clientId: replacement.clientId,
            vectorClock: replacement.vectorClock as Record<string, number>,
          });
          expect(replayDecision.shouldKeep).toBe(true);
          if (useImportingDevice) {
            const cached = (await readPreparationPersistence(consumer)).clock;
            const boundaryClock = replacement.vectorClock as Record<string, number>;
            expect(cached[replacement.clientId] ?? 0).toBeLessThan(
              boundaryClock[replacement.clientId],
            );
            expect(candidate.vectorClock[replacement.clientId]).toBeGreaterThanOrEqual(
              boundaryClock[replacement.clientId],
            );
          }
          const result = await harness.publishCapture({
            userId: user.userId,
            captureId,
            ...prepared,
          });
          expect(result.status).toBe('published');
          await clientA.sync.syncAndWait();
          await clientB.sync.syncAndWait();
          expect(await readCaptureState(clientA, prepared.taskId)).toEqual(
            await readCaptureState(clientB, prepared.taskId),
          );
          expect((await readCaptureState(clientA, prepared.taskId)).task?.title).toBe(
            title,
          );
          await Promise.all([
            clientA.page.goto('/#/project/INBOX_PROJECT/tasks'),
            clientB.page.goto('/#/project/INBOX_PROJECT/tasks'),
          ]);
          await Promise.all([
            waitForTask(clientA.page, title),
            waitForTask(clientB.page, title),
          ]);

          // The same genuine import after publication replaces task state, but it
          // cannot turn the terminal receipt back into a new task operation.
          await importBackupAndSync(clientA, syncConfig, testRunId);
          await clientB.sync.syncAndWait();
          const receipt = await harness.readCaptureReceipt({
            userId: user.userId,
            captureId,
          });
          expect(receipt).not.toBeNull();
          expect(await harness.countPublishedCaptures({ userId: user.userId })).toBe(1);
          const retry = await harness.publishCapture({
            userId: user.userId,
            captureId,
            ...prepared,
          });
          expect(retry.status).toBe('already_published');
          await clientA.sync.syncAndWait();
          await clientB.sync.syncAndWait();
          await expect(clientA.page.locator('task', { hasText: title })).toHaveCount(0);
          await expect(clientB.page.locator('task', { hasText: title })).toHaveCount(0);
          expect(await readCaptureState(clientA, prepared.taskId)).toEqual({
            task: null,
            projects: [],
          });
          expect(await readCaptureState(clientB, prepared.taskId)).toEqual({
            task: null,
            projects: [],
          });
        } finally {
          if (clientA) await closeClient(clientA);
          if (clientB) await closeClient(clientB);
          await prisma.$disconnect();
        }
      },
    );
  }
});

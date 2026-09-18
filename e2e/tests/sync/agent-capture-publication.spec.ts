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
  parseSuperSyncRequestBody,
  routeSuperSyncOps,
  waitForTask,
  type SimulatedE2EClient,
} from '../../utils/supersync-helpers';
import { waitForAppReady } from '../../utils/waits';
import { classifyOpAgainstSyncImport, decrypt, encrypt } from '@sp/sync-core';
import { PrismaClient } from '@prisma/client';
import { SyncService } from '../../../packages/super-sync-server/src/sync/sync.service';
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
  verifiedEncryptionOpId: string;
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
 * The data generation travels with the queue read, exactly as a production
 * preparer would receive it: reading a pending capture is already an
 * authenticated round trip to the same server, so no sync-contract field or
 * client-persisted copy is needed. Passing it in also keeps what this exercises
 * intact — the value belongs to the moment the candidate is built, not to the
 * moment it is published.
 */
const prepareCapture = async (options: {
  client: SimulatedE2EClient;
  captureId: string;
  title: string;
  publisherClientId: string;
  publisherCounter: number;
  /** As returned by the queue read that handed out this capture. */
  dataGeneration: number;
}): Promise<PreparedCaptureForPublication> => {
  const {
    client,
    captureId,
    title,
    publisherClientId,
    publisherCounter,
    dataGeneration: expectedDataGeneration,
  } = options;
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

  for (const closeDuringProbe of [true, false]) {
    test(`preserves local writes when the active tab closes ${closeDuringProbe ? 'during' : 'after'} preparation`, async ({
      browser,
      baseURL,
      testRunId,
    }) => {
      const prisma = new PrismaClient();
      const harness = createAgentCapturePublicationHarness(prisma);
      let client: SimulatedE2EClient | null = null;
      let releaseProbe = (): void => undefined;
      try {
        await harness.initialize();
        const user = await createTestUser(`${testRunId}-capture-interruption`);
        client = await createSimulatedClient(browser, baseURL!, 'Interrupted', testRunId);
        await client.sync.setupSuperSync(getSuperSyncConfig(user));
        await client.sync.syncAndWait();
        const blockBackgroundSync = (): void => {
          const flags = globalThis as typeof globalThis & {
            __SP_E2E_BLOCK_AUTO_SYNC?: boolean;
            __SP_E2E_BLOCK_IMMEDIATE_UPLOAD?: boolean;
            __SP_E2E_BLOCK_WS_DOWNLOAD?: boolean;
          };
          flags.__SP_E2E_BLOCK_AUTO_SYNC = true;
          flags.__SP_E2E_BLOCK_IMMEDIATE_UPLOAD = true;
          flags.__SP_E2E_BLOCK_WS_DOWNLOAD = true;
        };
        await client.context.addInitScript(blockBackgroundSync);
        await client.page.evaluate(blockBackgroundSync);
        const captureId = `interrupted-${testRunId}`;
        const title = `Interrupted capture ${testRunId}`;
        const pending = await harness.enqueueCapture({
          userId: user.userId,
          captureId,
          title,
        });
        const actor = getAgentCaptureActorId(user.userId);
        const input = {
          captureId,
          title,
          publisherClientId: actor,
          publisherCounter: pending.captureCounter,
        };
        const before = await readPreparationPersistence(client);
        const cursor = await readCursor(client);
        const page = client.page;
        let probeArrived = (): void => undefined;
        const probeSeen = new Promise<void>((resolve) => {
          probeArrived = resolve;
        });
        const probeReleased = new Promise<void>((resolve) => {
          releaseProbe = resolve;
        });
        // Delay the actual HTTP request; no fabricated response or storage seam.
        await routeSuperSyncOps(page, async (route) => {
          const url = new URL(route.request().url());
          if (
            url.searchParams.get('sinceSeq') === '0' &&
            url.searchParams.get('limit') === '1'
          ) {
            probeArrived();
            await probeReleased;
          }
          if (!page.isClosed()) await route.continue();
        });
        const preparing = page
          .evaluate(
            (value) =>
              (
                window as unknown as {
                  __e2eTestHelpers: {
                    prepareCapturePublication: (
                      args: typeof value,
                    ) => Promise<PreparedCapture>;
                  };
                }
              ).__e2eTestHelpers.prepareCapturePublication(value),
            input,
          )
          .then(
            (prepared) => ({ prepared }),
            (error: unknown) => ({ error: String(error) }),
          );
        await probeSeen;
        const localTitle = `Local edit during preparation ${testRunId}`;
        await client.workView.addTask(localTitle);
        await page.evaluate(() =>
          (
            window as unknown as {
              __e2eTestHelpers: {
                flushPendingWrites: () => Promise<void>;
              };
            }
          ).__e2eTestHelpers.flushPendingWrites(),
        );
        const afterWrite = await readPreparationPersistence(client);
        expect(afterWrite.operationIds.length).toBeGreaterThan(
          before.operationIds.length,
        );
        expect(afterWrite.clock[actor]).toBeUndefined();
        if (!closeDuringProbe) {
          releaseProbe();
          const outcome = await preparing;
          if ('error' in outcome) throw new Error(outcome.error);
          expect(outcome.prepared.candidate.vectorClock).toEqual({
            ...afterWrite.clock,
            [actor]: 1,
          });
          expect(outcome.prepared.lastKnownServerSeq).toBe(cursor);
          expect(await readPreparationPersistence(client)).toEqual(afterWrite);
          expect(await readCursor(client)).toBe(cursor);
        }
        await page.close();
        releaseProbe();
        if (closeDuringProbe) {
          expect(await preparing).toMatchObject({
            error: expect.stringMatching(/closed|destroyed/),
          });
        }
        expect(
          await harness.readCaptureReceipt({ userId: user.userId, captureId }),
        ).toBeNull();
        expect(await harness.readPublicationWatermark({ userId: user.userId })).toBe(0);
        expect(await harness.countCaptureActorOperations({ userId: user.userId })).toBe(
          0,
        );

        // Reopen the same storage with the normal single-instance check intact.
        client.page = await client.context.newPage();
        await client.page.goto(baseURL!);
        await waitForAppReady(client.page);
        client.workView = new WorkViewPage(client.page, `Reopened-${testRunId}`);
        client.sync = new SuperSyncPage(client.page);
        await waitForTask(client.page, localTitle);
        expect(await readCaptureState(client, `capture-${captureId}`)).toEqual({
          task: null,
          projects: [],
        });
        expect((await readPreparationPersistence(client)).clock[actor]).toBeUndefined();
        expect(await readCursor(client)).toBe(cursor);
        const retry = await harness.readPendingCapture({
          userId: user.userId,
          captureId,
        });
        expect(retry?.captureCounter).toBe(0);
        const prepared = await prepareCapture({
          client,
          ...input,
          dataGeneration: retry!.dataGeneration,
        });
        expect(
          await harness.publishCapture({ userId: user.userId, captureId, ...prepared }),
        ).toMatchObject({ status: 'published' });
        await client.sync.syncAndWait();
        expect((await readCaptureState(client, prepared.taskId)).task?.title).toBe(title);
        await waitForTask(client.page, localTitle);
        expect(await harness.countCaptureActorOperations({ userId: user.userId })).toBe(
          1,
        );
      } finally {
        releaseProbe();
        if (client?.page.isClosed()) await client.context.close();
        else if (client) await closeClient(client);
        await prisma.$disconnect();
      }
    });
  }

  test('keeps captures pending through an encryption wipe and a retired-key preparation', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    const prisma = new PrismaClient();
    const harness = createAgentCapturePublicationHarness(prisma);
    const sync = new SyncService();
    let oldClient: SimulatedE2EClient | null = null;
    let currentClient: SimulatedE2EClient | null = null;
    try {
      await harness.initialize();
      const user = await createTestUser(`${testRunId}-capture-key`);
      const config = getSuperSyncConfig(user);
      oldClient = await createSimulatedClient(browser, baseURL!, 'Old-key', testRunId);
      await oldClient.sync.setupSuperSync(config);
      await oldClient.sync.syncAndWait();
      const oldBaseline = (await sync.getOpsSinceWithSeq(user.userId, 0, undefined, 1))
        .ops[0].op;
      expect(oldBaseline.isPayloadEncrypted).toBe(true);
      expect(oldBaseline.opType).toBe('SYNC_IMPORT');
      const plaintext = await decrypt(oldBaseline.payload as string, config.password!);
      const currentKey = 'capture-replacement-encryption-key';
      await sync.deleteAllUserData(user.userId);

      const captureId = `key-capture-${testRunId}`;
      const title = `After key change ${testRunId}`;
      const pending = await harness.enqueueCapture({
        userId: user.userId,
        captureId,
        title,
      });
      const input = {
        captureId,
        title,
        publisherClientId: getAgentCaptureActorId(user.userId),
        publisherCounter: pending.captureCounter,
        dataGeneration: pending.dataGeneration,
      };
      const before = await readPreparationPersistence(oldClient);
      const cursor = await readCursor(oldClient);
      await expect(prepareCapture({ client: oldClient, ...input })).rejects.toThrow(
        'current encrypted baseline',
      );

      // Complete the wipe with real, valid full-state ciphertext under the new
      // key. Deliberately retain the clock: causal knowledge alone is not key evidence.
      const currentBaseline = {
        ...oldBaseline,
        id: `key-baseline-${testRunId}`,
        payload: await encrypt(plaintext, currentKey),
      };
      const uploaded = await sync.uploadOps(
        user.userId,
        currentBaseline.clientId,
        [currentBaseline],
        true,
      );
      expect(uploaded[0].accepted).toBe(true);
      await expect(prepareCapture({ client: oldClient, ...input })).rejects.toThrow(
        'Failed to decrypt operation payload',
      );
      expect(await readPreparationPersistence(oldClient)).toEqual(before);
      expect(await readCursor(oldClient)).toBe(cursor);
      expect(
        await harness.readCaptureReceipt({ userId: user.userId, captureId }),
      ).toBeNull();
      expect(await harness.countCaptureActorOperations({ userId: user.userId })).toBe(0);
      expect(
        await harness.readPendingCapture({ userId: user.userId, captureId }),
      ).not.toBeNull();

      currentClient = await createSimulatedClient(
        browser,
        baseURL!,
        'Current-key',
        testRunId,
      );
      await currentClient.sync.setupSuperSync({ ...config, password: currentKey });
      const prepared = await prepareCapture({ client: currentClient, ...input });
      expect(prepared.verifiedEncryptionOpId).toBe(currentBaseline.id);
      expect(
        await harness.publishCapture({ userId: user.userId, captureId, ...prepared }),
      ).toMatchObject({ status: 'published' });
      await currentClient.sync.syncAndWait();
      expect((await readCaptureState(currentClient, prepared.taskId)).task?.title).toBe(
        title,
      );
    } finally {
      if (oldClient) await closeClient(oldClient);
      if (currentClient) await closeClient(currentClient);
      await prisma.$disconnect();
    }
  });

  for (const clockPressure of [false, true]) {
    test(`publishes an encrypted capture once after a lost response and never recreates a deleted task${clockPressure ? ' with client clock pruning' : ''}`, async ({
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

        if (clockPressure) {
          // Seed retained history from 21 identities, not 21 live browsers. Each
          // task has a genuine encrypted app payload and uses ordinary server upload.
          for (const client of [clientA, clientB]) {
            const blockBackgroundSync = (): void => {
              const flags = globalThis as typeof globalThis & {
                __SP_E2E_BLOCK_AUTO_SYNC?: boolean;
                __SP_E2E_BLOCK_IMMEDIATE_UPLOAD?: boolean;
                __SP_E2E_BLOCK_WS_DOWNLOAD?: boolean;
              };
              flags.__SP_E2E_BLOCK_AUTO_SYNC = true;
              flags.__SP_E2E_BLOCK_IMMEDIATE_UPLOAD = true;
              flags.__SP_E2E_BLOCK_WS_DOWNLOAD = true;
            };
            await client.context.addInitScript(blockBackgroundSync);
            await client.page.evaluate(blockBackgroundSync);
          }
          const sync = new SyncService();
          let historyClock: Record<string, number> = {};
          for (let i = 0; i < 21; i++) {
            const seed = await prepareCapture({
              client: clientA,
              captureId: `clock-history-${i}-${testRunId}`,
              title: `Clock history ${i}`,
              publisherClientId: `history-device-${i}`,
              publisherCounter: 100 + i,
              dataGeneration: 0,
            });
            historyClock = { ...seed.candidate.vectorClock, ...historyClock };
            const results = await sync.uploadOps(user.userId, seed.candidate.clientId, [
              { ...seed.candidate, vectorClock: { ...historyClock } },
            ]);
            expect(results[0].accepted).toBe(true);
          }
          expect(Object.keys(historyClock).length).toBeGreaterThan(20);
          await clientA.sync.syncAndWait();
          await clientB.sync.syncAndWait();
          for (const client of [clientA, clientB]) {
            expect(
              Object.keys((await readPreparationPersistence(client)).clock),
            ).toHaveLength(20);
          }
        }

        const pending = await harness.enqueueCapture({
          userId: user.userId,
          captureId,
          title,
        });
        const watermark = await harness.readPublicationWatermark({ userId: user.userId });
        expect(pending.captureCounter).toBe(watermark);

        const [preparedA, preparedB] = await Promise.all([
          prepareCapture({
            client: clientA,
            captureId,
            title,
            publisherClientId: captureActorId,
            publisherCounter: watermark,
            dataGeneration: pending.dataGeneration,
          }),
          prepareCapture({
            client: clientB,
            captureId,
            title,
            publisherClientId: captureActorId,
            publisherCounter: watermark,
            dataGeneration: pending.dataGeneration,
          }),
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
        expect(await harness.countCaptureActorOperations({ userId: user.userId })).toBe(
          1,
        );
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
        expect((await readCaptureState(clientA, preparedA.taskId)).task?.title).toBe(
          title,
        );
        await Promise.all([
          clientA.page.goto('/#/project/INBOX_PROJECT/tasks'),
          clientB.page.goto('/#/project/INBOX_PROJECT/tasks'),
        ]);
        await waitForTask(clientA.page, title);
        const editUploads: {
          clock: Record<string, number>;
          accepted: boolean;
          errorCode?: string;
        }[] = [];
        if (clockPressure) {
          for (const client of [clientA, clientB]) {
            const clock = (await readPreparationPersistence(client)).clock;
            expect(Object.keys(clock)).toHaveLength(20);
            expect(clock[captureActorId]).toBeUndefined();
          }
          // Observe genuine server responses without altering requests or results.
          await routeSuperSyncOps(clientA.page, async (route) => {
            if (route.request().method() !== 'POST') {
              await route.continue();
              return;
            }
            const body = parseSuperSyncRequestBody<{ ops: Operation[] }>(route.request());
            const response = await route.fetch();
            const json = (await response.json()) as {
              results: { opId: string; accepted: boolean; errorCode?: string }[];
            };
            for (const op of body.ops.filter(
              (entry) => entry.entityId === preparedA.taskId,
            )) {
              const result = json.results.find((entry) => entry.opId === op.id);
              if (result) editUploads.push({ clock: op.vectorClock, ...result });
            }
            await route.fulfill({ response });
          });
        }
        const editedTitle = `${title} after local edit`;
        await renameTask(clientA, title, editedTitle);
        await clientA.sync.syncAndWait();
        if (clockPressure) {
          expect(
            editUploads.some(
              (upload) =>
                upload.clock[captureActorId] === undefined &&
                upload.errorCode === 'CONFLICT_CONCURRENT',
            ),
          ).toBe(true);
          expect(
            editUploads.some(
              (upload) =>
                upload.clock[captureActorId] === 1 &&
                Object.keys(upload.clock).length > 20 &&
                upload.accepted,
            ),
          ).toBe(true);
        }
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
        await expect(clientA.page.locator('task', { hasText: editedTitle })).toHaveCount(
          1,
        );
        await expect(clientB.page.locator('task', { hasText: editedTitle })).toHaveCount(
          1,
        );

        await deleteTask(clientA, editedTitle);
        await clientA.sync.syncAndWait();
        await clientB.sync.syncAndWait();
        await expect(clientA.page.locator('task', { hasText: editedTitle })).toHaveCount(
          0,
        );
        await expect(clientB.page.locator('task', { hasText: editedTitle })).toHaveCount(
          0,
        );
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
  }

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

          const queued = await harness.enqueueCapture({
            userId: user.userId,
            captureId,
            title,
          });
          const stalePreparation = await prepareCapture({
            client: clientA,
            captureId,
            title,
            publisherClientId: captureActorId,
            publisherCounter: 0,
            dataGeneration: queued.dataGeneration,
          });

          // Genuine app backup import before candidate preparation establishes the
          // replacement baseline; no fabricated server state is used.
          await importBackupAndSync(clientA, syncConfig, testRunId);
          await clientB.sync.syncAndWait();

          const watermark = await harness.readPublicationWatermark({
            userId: user.userId,
          });
          // The consumer re-reads the queue before rebuilding, which is also
          // where it learns the current generation.
          const stillPending = await harness.readPendingCapture({
            userId: user.userId,
            captureId,
          });
          expect(stillPending).not.toBeNull();
          const consumer = useImportingDevice ? clientA : clientB;
          const prepared = await prepareCapture({
            client: consumer,
            captureId,
            title,
            publisherClientId: captureActorId,
            publisherCounter: watermark,
            dataGeneration: stillPending!.dataGeneration,
          });
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

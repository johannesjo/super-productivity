import { expect, test } from '../../fixtures/supersync.fixture';
import type { Page, Response, Route } from '@playwright/test';
import { SuperSyncPage } from '../../pages/supersync.page';
import { WorkViewPage } from '../../pages/work-view.page';
import {
  closeClient,
  createSimulatedClient,
  createTestUser,
  getSuperSyncConfig,
  parseSuperSyncRequestBody,
  renameTask,
  SUPERSYNC_BASE_URL,
  type SimulatedE2EClient,
  waitForTask,
} from '../../utils/supersync-helpers';
import { waitForAppReady } from '../../utils/waits';

interface SnapshotUploadRequest {
  opId?: string;
  repairBaseServerSeq?: number;
  snapshotOpType?: string;
}

interface SnapshotUploadResponse {
  accepted?: boolean;
  errorCode?: string;
  serverSeq?: number;
}

interface StoredRepairOperation {
  baseServerSeq?: number;
  id: string;
  rejectedAt?: number;
  source: 'local' | 'remote';
  syncedAt?: number;
}

interface ServerOperation {
  id: string;
  opType: string;
  serverSeq: number;
}

interface TaskSnapshot {
  id: string;
  tagIds: string[];
  title: string;
}

const getServerOperations = async (userId: number): Promise<ServerOperation[]> => {
  const response = await fetch(
    `${SUPERSYNC_BASE_URL}/api/test/user/${userId}/ops?limit=100`,
  );
  if (!response.ok) {
    throw new Error(
      `Failed to inspect server operations: ${response.status} ${await response.text()}`,
    );
  }
  const body = (await response.json()) as { ops: ServerOperation[] };
  return body.ops;
};

const getLatestServerSeq = async (userId: number): Promise<number> => {
  const operations = await getServerOperations(userId);
  return Math.max(0, ...operations.map(({ serverSeq }) => serverSeq));
};

const getTaskSnapshots = async (
  page: Page,
  exactTitle: string,
): Promise<TaskSnapshot[]> =>
  page.evaluate((title) => {
    type TaskLike = {
      id?: string;
      tagIds?: unknown;
      title?: string;
    };
    type StoreState = {
      task?: { entities?: Record<string, TaskLike | undefined> };
      tasks?: { entities?: Record<string, TaskLike | undefined> };
    };
    type StoreLike = {
      subscribe: (next: (state: StoreState) => void) => { unsubscribe: () => void };
    };

    const store = (
      window as unknown as {
        __e2eTestHelpers?: { store?: StoreLike };
      }
    ).__e2eTestHelpers?.store;
    if (!store) {
      throw new Error('__e2eTestHelpers.store missing');
    }

    let latestState: StoreState | undefined;
    const subscription = store.subscribe((state) => {
      latestState = state;
    });
    subscription.unsubscribe();

    const taskState = latestState?.tasks ?? latestState?.task;
    return Object.values(taskState?.entities ?? {}).flatMap((task) => {
      if (
        task?.title !== title ||
        typeof task.id !== 'string' ||
        !Array.isArray(task.tagIds) ||
        !task.tagIds.every((tagId) => typeof tagId === 'string')
      ) {
        return [];
      }
      return [
        {
          id: task.id,
          tagIds: task.tagIds as string[],
          title: task.title,
        },
      ];
    });
  }, exactTitle);

const addGhostTagReference = async (
  page: Page,
  taskTitle: string,
  ghostTagId: string,
): Promise<void> => {
  await page.evaluate(
    ({ title, tagId }) => {
      type TaskLike = {
        id?: string;
        tagIds?: string[];
        title?: string;
      };
      type StoreState = {
        task?: { entities?: Record<string, TaskLike | undefined> };
        tasks?: { entities?: Record<string, TaskLike | undefined> };
      };
      type StoreLike = {
        dispatch: (action: unknown) => void;
        subscribe: (next: (state: StoreState) => void) => { unsubscribe: () => void };
      };

      const store = (
        window as unknown as {
          __e2eTestHelpers?: { store?: StoreLike };
        }
      ).__e2eTestHelpers?.store;
      if (!store) {
        throw new Error('__e2eTestHelpers.store missing');
      }

      let latestState: StoreState | undefined;
      const subscription = store.subscribe((state) => {
        latestState = state;
      });
      subscription.unsubscribe();

      const taskState = latestState?.tasks ?? latestState?.task;
      const task = Object.values(taskState?.entities ?? {}).find(
        (candidate) => candidate?.title === title,
      );
      if (!task || typeof task.id !== 'string') {
        throw new Error(`Task not found: ${title}`);
      }

      store.dispatch({
        type: '[Task Shared] updateTask',
        task: {
          id: task.id,
          changes: {
            tagIds: [...(task.tagIds ?? []), tagId],
          },
        },
        isIgnoreShortSyntax: true,
        meta: {
          isPersistent: true,
          entityType: 'TASK',
          entityId: task.id,
          opType: 'UPD',
        },
      });
    },
    { title: taskTitle, tagId: ghostTagId },
  );

  await expect
    .poll(async () => (await getTaskSnapshots(page, taskTitle))[0]?.tagIds ?? [])
    .toContain(ghostTagId);
};

const getStoredRepairOperations = async (page: Page): Promise<StoredRepairOperation[]> =>
  page.evaluate(async () => {
    type CompactRepairEntry = {
      op?: {
        b?: number;
        id?: string;
        o?: string;
      };
      rejectedAt?: number;
      source?: 'local' | 'remote';
      syncedAt?: number;
    };

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('SUP_OPS');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    try {
      if (!db.objectStoreNames.contains('ops')) {
        return [];
      }
      const entries = await new Promise<CompactRepairEntry[]>((resolve, reject) => {
        const transaction = db.transaction('ops', 'readonly');
        const request = transaction.objectStore('ops').getAll();
        request.onsuccess = () => resolve(request.result as CompactRepairEntry[]);
        request.onerror = () => reject(request.error);
      });

      return entries.flatMap((entry) => {
        if (
          entry.op?.o !== 'REPAIR' ||
          typeof entry.op.id !== 'string' ||
          (entry.source !== 'local' && entry.source !== 'remote')
        ) {
          return [];
        }
        return [
          {
            id: entry.op.id,
            source: entry.source,
            ...(entry.op.b !== undefined ? { baseServerSeq: entry.op.b } : {}),
            ...(entry.syncedAt !== undefined ? { syncedAt: entry.syncedAt } : {}),
            ...(entry.rejectedAt !== undefined ? { rejectedAt: entry.rejectedAt } : {}),
          },
        ];
      });
    } finally {
      db.close();
    }
  });

const forwardResponse = async (
  route: Route,
  response: Response,
): Promise<SnapshotUploadResponse> => {
  const body = await response.body();
  const decoded = JSON.parse(body.toString('utf8')) as SnapshotUploadResponse;
  await route.fulfill({ response, body });
  return decoded;
};

const expectConvergedTask = async (
  client: SimulatedE2EClient,
  taskTitle: string,
  ghostTagId: string,
): Promise<void> => {
  await waitForTask(client.page, taskTitle);
  await expect
    .poll(() => getTaskSnapshots(client.page, taskTitle), {
      message: `${client.clientName} did not converge to exactly one repaired task`,
    })
    .toHaveLength(1);
  expect((await getTaskSnapshots(client.page, taskTitle))[0].tagIds).not.toContain(
    ghostTagId,
  );
};

test.describe('@supersync REPAIR lifecycle', () => {
  test.describe.configure({ mode: 'serial' });

  test('rebases a stale repair, retries it after reload, and converges all clients', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    test.setTimeout(240000);

    const appUrl = baseURL || 'http://localhost:4242';
    const taskTitle = `A-${testRunId}-RepairLifecycle`;
    const renamedTaskTitle = `${taskTitle}-RenamedByB`;
    const ghostTagId = `ghost-tag-${testRunId}`;
    let clientA: SimulatedE2EClient | null = null;
    let clientB: SimulatedE2EClient | null = null;
    let clientC: SimulatedE2EClient | null = null;

    try {
      const user = await createTestUser(testRunId);
      const syncConfig = getSuperSyncConfig(user);

      clientA = await createSimulatedClient(browser, appUrl, 'A', testRunId);
      await clientA.workView.waitForTaskList();
      await clientA.sync.setupSuperSync(syncConfig);

      clientB = await createSimulatedClient(browser, appUrl, 'B', testRunId);
      await clientB.workView.waitForTaskList();
      await clientB.sync.setupSuperSync(syncConfig);

      await clientA.workView.addTask(taskTitle);
      await clientA.sync.syncAndWait();
      await clientB.sync.syncAndWait();
      await waitForTask(clientB.page, taskTitle);

      await addGhostTagReference(clientB.page, taskTitle, ghostTagId);
      const serverSeqBeforeCorruption = await getLatestServerSeq(user.userId);
      await clientB.sync.syncAndWait();
      const corruptionServerSeq = await getLatestServerSeq(user.userId);
      expect(corruptionServerSeq).toBeGreaterThan(serverSeqBeforeCorruption);

      let firstRepairRequest: SnapshotUploadRequest | undefined;
      let firstRepairResponse: SnapshotUploadResponse | undefined;
      let replacementRepairRequest: SnapshotUploadRequest | undefined;
      let replacementAcceptedResponse: SnapshotUploadResponse | undefined;
      let replacementAbortCount = 0;
      let replacementRetryCount = 0;
      let allowReplacementCommit = false;

      let markFirstRepairSeen!: () => void;
      const firstRepairSeen = new Promise<void>((resolve) => {
        markFirstRepairSeen = resolve;
      });
      let releaseFirstRepair!: () => void;
      const firstRepairRelease = new Promise<void>((resolve) => {
        releaseFirstRepair = resolve;
      });
      let markReplacementAborted!: () => void;
      const replacementAborted = new Promise<void>((resolve) => {
        markReplacementAborted = resolve;
      });
      let markReplacementAccepted!: () => void;
      const replacementAccepted = new Promise<void>((resolve) => {
        markReplacementAccepted = resolve;
      });

      await clientA.page.route('**/api/sync/snapshot', async (route) => {
        const request = parseSuperSyncRequestBody<SnapshotUploadRequest>(route.request());
        if (request.snapshotOpType !== 'REPAIR' || !request.opId) {
          await route.continue();
          return;
        }

        if (!firstRepairRequest) {
          firstRepairRequest = request;
          markFirstRepairSeen();
          await firstRepairRelease;
          const response = await route.fetch();
          firstRepairResponse = await forwardResponse(route, response);
          return;
        }

        if (request.opId === firstRepairRequest.opId) {
          throw new Error(`Stale REPAIR ${request.opId} was uploaded more than once`);
        }

        if (!replacementRepairRequest) {
          replacementRepairRequest = request;
        } else {
          expect(request.opId).toBe(replacementRepairRequest.opId);
          expect(request.repairBaseServerSeq).toBe(
            replacementRepairRequest.repairBaseServerSeq,
          );
        }

        if (!allowReplacementCommit) {
          if (replacementAbortCount === 0) {
            replacementAbortCount++;
            await route.abort('failed');
            markReplacementAborted();
            return;
          }
          // The provider retries one transport failure itself. Keep that retry
          // away from the server with a retryable HTTP response so the one
          // explicit abort still leaves the replacement pending for reload.
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Temporary test outage' }),
          });
          return;
        }

        replacementRetryCount++;
        const response = await route.fetch();
        replacementAcceptedResponse = await forwardResponse(route, response);
        markReplacementAccepted();
      });

      await clientA.sync.syncBtn.click();
      await firstRepairSeen;
      await expect(clientA.sync.syncSpinner).toBeVisible();
      expect(firstRepairRequest?.repairBaseServerSeq).toBe(corruptionServerSeq);

      await renameTask(clientB, taskTitle, renamedTaskTitle);
      await clientB.sync.syncAndWait();
      const concurrentServerSeq = await getLatestServerSeq(user.userId);
      expect(concurrentServerSeq).toBeGreaterThan(corruptionServerSeq);

      releaseFirstRepair();
      await replacementAborted;
      await clientA.sync.syncSpinner.waitFor({ state: 'hidden', timeout: 30000 });

      expect(firstRepairResponse).toMatchObject({
        accepted: false,
        errorCode: 'REPAIR_STALE',
      });
      expect(replacementAbortCount).toBe(1);
      expect(replacementRepairRequest?.opId).not.toBe(firstRepairRequest?.opId);
      expect(replacementRepairRequest?.repairBaseServerSeq).toBe(concurrentServerSeq);

      const repairsBeforeReload = await getStoredRepairOperations(clientA.page);
      const staleRepairBeforeReload = repairsBeforeReload.find(
        ({ id }) => id === firstRepairRequest?.opId,
      );
      const replacementBeforeReload = repairsBeforeReload.find(
        ({ id }) => id === replacementRepairRequest?.opId,
      );
      expect(staleRepairBeforeReload).toMatchObject({
        source: 'local',
        baseServerSeq: corruptionServerSeq,
      });
      expect(staleRepairBeforeReload?.rejectedAt).toBeDefined();
      expect(staleRepairBeforeReload?.syncedAt).toBeUndefined();
      expect(replacementBeforeReload).toMatchObject({
        source: 'local',
        baseServerSeq: concurrentServerSeq,
      });
      expect(replacementBeforeReload?.rejectedAt).toBeUndefined();
      expect(replacementBeforeReload?.syncedAt).toBeUndefined();

      await clientA.page.addInitScript(() => {
        const e2eGlobal = globalThis as typeof globalThis & {
          __SP_E2E_BLOCK_AUTO_SYNC?: boolean;
          __SP_E2E_BLOCK_IMMEDIATE_UPLOAD?: boolean;
          __SP_E2E_BLOCK_WS_DOWNLOAD?: boolean;
        };
        e2eGlobal.__SP_E2E_BLOCK_AUTO_SYNC = true;
        e2eGlobal.__SP_E2E_BLOCK_IMMEDIATE_UPLOAD = true;
        e2eGlobal.__SP_E2E_BLOCK_WS_DOWNLOAD = true;
      });
      await clientA.page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      clientA.workView = new WorkViewPage(clientA.page, `A-${testRunId}`);
      clientA.sync = new SuperSyncPage(clientA.page);
      await waitForAppReady(clientA.page);
      await clientA.workView.waitForTaskList();

      allowReplacementCommit = true;
      await clientA.sync.syncAndWait({ timeout: 60000 });
      await replacementAccepted;
      expect(replacementRetryCount).toBe(1);
      expect(replacementAcceptedResponse?.accepted).toBe(true);
      expect(replacementAcceptedResponse?.serverSeq).toBeGreaterThan(concurrentServerSeq);

      const repairsAfterRetry = await getStoredRepairOperations(clientA.page);
      expect(repairsAfterRetry).toHaveLength(2);
      const retriedReplacement = repairsAfterRetry.find(
        ({ id }) => id === replacementRepairRequest?.opId,
      );
      expect(retriedReplacement?.syncedAt).toBeDefined();
      expect(retriedReplacement?.rejectedAt).toBeUndefined();

      const repairRequestCountBeforeNoop =
        1 + replacementAbortCount + replacementRetryCount;
      await clientA.sync.syncAndWait();
      expect(1 + replacementAbortCount + replacementRetryCount).toBe(
        repairRequestCountBeforeNoop,
      );
      expect(await getStoredRepairOperations(clientA.page)).toHaveLength(2);

      const serverRepairOperations = (await getServerOperations(user.userId)).filter(
        ({ opType }) => opType === 'REPAIR',
      );
      expect(serverRepairOperations).toHaveLength(1);
      expect(serverRepairOperations[0].id).toBe(replacementRepairRequest?.opId);
      expect(
        serverRepairOperations.some(({ id }) => id === firstRepairRequest?.opId),
      ).toBe(false);

      await clientB.sync.syncAndWait();
      await expectConvergedTask(clientA, renamedTaskTitle, ghostTagId);
      await expectConvergedTask(clientB, renamedTaskTitle, ghostTagId);

      let clientCRepairUploads = 0;
      clientC = await createSimulatedClient(browser, appUrl, 'C', testRunId);
      await clientC.workView.waitForTaskList();
      await clientC.page.route('**/api/sync/snapshot', async (route) => {
        const request = parseSuperSyncRequestBody<SnapshotUploadRequest>(route.request());
        if (request.snapshotOpType === 'REPAIR') {
          clientCRepairUploads++;
        }
        await route.continue();
      });
      await clientC.sync.setupSuperSync(syncConfig);
      await clientC.sync.syncAndWait();
      await expectConvergedTask(clientC, renamedTaskTitle, ghostTagId);
      expect(clientCRepairUploads).toBe(0);

      for (const client of [clientA, clientB, clientC]) {
        const pendingLocalRepairs = (await getStoredRepairOperations(client.page)).filter(
          ({ rejectedAt, source, syncedAt }) =>
            source === 'local' && rejectedAt === undefined && syncedAt === undefined,
        );
        expect(pendingLocalRepairs).toEqual([]);
      }
    } finally {
      if (clientA) await closeClient(clientA);
      if (clientB) await closeClient(clientB);
      if (clientC) await closeClient(clientC);
    }
  });
});

import { PrismaClient } from '@prisma/client';
import { test, expect } from '../../fixtures/supersync.fixture';
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
import { createAgentCapturePublicationHarness } from '../../../packages/super-sync-server/tests/integration/agent-capture-publication.harness';

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

/** Queue seeding is a fixture; preparation, publication and replay are production. */
test.describe('@supersync Agent capture delivery', () => {
  test.skip(!process.env.DATABASE_URL, 'requires an isolated PostgreSQL database');

  test('imports queued captures through ordinary encrypted sync on two devices', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    const prisma = new PrismaClient();
    const queue = createAgentCapturePublicationHarness(prisma);
    const clients: SimulatedE2EClient[] = [];
    try {
      const user = await createTestUser(`${testRunId}-capture-delivery`);
      const a = await createSimulatedClient(browser, baseURL!, 'Capture-A', testRunId);
      clients.push(a);
      await a.sync.setupSuperSync(getSuperSyncConfig(user));
      await a.sync.syncAndWait();
      const captureId = `delivery-${testRunId}`;
      const title = `Capture delivery ${testRunId}`;
      await queue.enqueueCapture({ userId: user.userId, captureId, title });

      await a.sync.syncAndWait();
      expect(await queue.countCaptureActorOperations({ userId: user.userId })).toBe(1);
      const receipt = await queue.readCaptureReceipt({ userId: user.userId, captureId });
      expect(receipt).not.toBeNull();
      const operation = await prisma.operation.findUnique({
        where: { id: receipt!.opId },
      });
      expect(operation?.isPayloadEncrypted).toBe(true);
      expect(
        await queue.readPendingCapture({ userId: user.userId, captureId }),
      ).toBeNull();

      await a.page.goto('/#/project/INBOX_PROJECT/tasks');
      await waitForTask(a.page, title);

      const b = await createSimulatedClient(browser, baseURL!, 'Capture-B', testRunId);
      clients.push(b);
      await b.sync.setupSuperSync(getSuperSyncConfig(user));
      await b.sync.syncAndWait();
      await b.page.goto('/#/project/INBOX_PROJECT/tasks');
      await waitForTask(b.page, title);
      const edited = `${title} edited`;
      await renameTask(b, title, edited);
      await b.sync.syncAndWait();
      await a.sync.syncAndWait();
      await waitForTask(a.page, edited);
      await deleteTask(a, edited);
      await a.sync.syncAndWait();
      await b.sync.syncAndWait();
      await expect(b.page.locator('task').filter({ hasText: edited })).toHaveCount(0);
      await a.sync.syncAndWait();
      expect(await queue.readCaptureReceipt({ userId: user.userId, captureId })).toEqual(
        receipt,
      );
      expect(await queue.countCaptureActorOperations({ userId: user.userId })).toBe(1);
    } finally {
      for (const client of clients) await closeClient(client);
      await prisma.$disconnect();
    }
  });

  test('recovers a committed capture after its response is lost and the app restarts', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    const prisma = new PrismaClient();
    const queue = createAgentCapturePublicationHarness(prisma);
    const clients: SimulatedE2EClient[] = [];
    try {
      const user = await createTestUser(`${testRunId}-capture-restart`);
      const a = await createSimulatedClient(
        browser,
        baseURL!,
        'Capture-Restart',
        testRunId,
      );
      clients.push(a);
      await a.sync.setupSuperSync(getSuperSyncConfig(user));
      await a.sync.syncAndWait();
      await a.page.goto('/#/project/INBOX_PROJECT/tasks');
      const captureId = `restart-${testRunId}`;
      const title = `Capture restart ${testRunId}`;
      await queue.enqueueCapture({ userId: user.userId, captureId, title });
      const publicationRoute = '**/api/sync/captures/publish';
      await a.page.route(publicationRoute, async (route) => {
        // Preparation must not optimistically create a local task.
        await expect(a.page.locator('task').filter({ hasText: title })).toHaveCount(0);
        const response = await route.fetch();
        expect(response.ok()).toBe(true);
        await route.abort('failed');
      });
      await a.sync.clickSyncBtn();
      await expect
        .poll(() => queue.readCaptureReceipt({ userId: user.userId, captureId }))
        .not.toBeNull();
      await expect(a.sync.syncSpinner).toBeHidden();
      await expect(a.page.locator('task').filter({ hasText: title })).toHaveCount(0);
      expect(await queue.countCaptureActorOperations({ userId: user.userId })).toBe(1);
      const receipt = await queue.readCaptureReceipt({ userId: user.userId, captureId });

      await a.page.unroute(publicationRoute);
      await a.page.reload();
      await waitForAppReady(a.page);
      await a.sync.syncAndWait();
      await waitForTask(a.page, title);
      await expect(a.page.locator('task').filter({ hasText: title })).toHaveCount(1);
      expect(await queue.readCaptureReceipt({ userId: user.userId, captureId })).toEqual(
        receipt,
      );
      expect(await queue.countCaptureActorOperations({ userId: user.userId })).toBe(1);
    } finally {
      for (const client of clients) await closeClient(client);
      await prisma.$disconnect();
    }
  });

  test('keeps manual sync pending when its capture batch is full', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    const prisma = new PrismaClient();
    const queue = createAgentCapturePublicationHarness(prisma);
    const clients: SimulatedE2EClient[] = [];
    try {
      const user = await createTestUser(`${testRunId}-capture-batch`);
      const a = await createSimulatedClient(
        browser,
        baseURL!,
        'Capture-Batch',
        testRunId,
      );
      clients.push(a);
      await a.sync.setupSuperSync(getSuperSyncConfig(user));
      await a.sync.syncAndWait();
      for (let index = 0; index < 11; index++) {
        await queue.enqueueCapture({
          userId: user.userId,
          captureId: `batch-${testRunId}-${index}`,
          title: `Batch capture ${index}`,
        });
      }
      await a.sync.clickSyncBtn();
      await expect
        .poll(() => queue.countCaptureActorOperations({ userId: user.userId }), {
          timeout: 60000,
        })
        .toBe(10);
      await expect(a.sync.syncSpinner).toBeHidden();
      await expect(
        a.page.locator('.sync-btn mat-icon').filter({ hasText: 'done_all' }),
      ).toBeHidden();
      await expect(a.page.locator('button.sync-btn')).not.toHaveAttribute(
        'aria-label',
        /^In sync/,
      );
      expect(await queue.countPublishedCaptures({ userId: user.userId })).toBe(10);
      await a.sync.syncAndWait();
      expect(await queue.countPublishedCaptures({ userId: user.userId })).toBe(11);
      expect(await queue.countCaptureActorOperations({ userId: user.userId })).toBe(11);
      await a.page.goto('/#/project/INBOX_PROJECT/tasks');
      await expect(
        a.page.locator('task').filter({ hasText: 'Batch capture' }),
      ).toHaveCount(11);
    } finally {
      for (const client of clients) await closeClient(client);
      await prisma.$disconnect();
    }
  });

  test('receives one task on both devices when their publications compete', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    const prisma = new PrismaClient();
    const queue = createAgentCapturePublicationHarness(prisma);
    const clients: SimulatedE2EClient[] = [];
    let releasePublications = (): void => undefined;
    const released = new Promise<void>((resolve) => {
      releasePublications = resolve;
    });
    try {
      const user = await createTestUser(`${testRunId}-capture-race`);
      for (const name of ['Race-A', 'Race-B']) {
        const client = await createSimulatedClient(browser, baseURL!, name, testRunId);
        clients.push(client);
        await client.sync.setupSuperSync(getSuperSyncConfig(user));
        await client.sync.syncAndWait();
        await client.context.addInitScript(blockBackgroundSync);
        await client.page.evaluate(blockBackgroundSync);
        await client.page.goto('/#/project/INBOX_PROJECT/tasks');
      }
      const captureId = `race-${testRunId}`;
      const title = `Competing capture ${testRunId}`;
      await queue.enqueueCapture({ userId: user.userId, captureId, title });
      const candidates: { id: string; entityId: string }[] = [];
      const outcomes: string[] = [];
      for (const client of clients) {
        await client.page.route('**/api/sync/captures/publish', async (route) => {
          const body = route.request().postDataJSON() as {
            candidate: { id: string; entityId: string };
          };
          candidates.push(body.candidate);
          await released;
          if (client.page.isClosed()) return;
          const response = await route.fetch();
          expect(response.ok()).toBe(true);
          outcomes.push(((await response.json()) as { status: string }).status);
          await route.fulfill({ response });
        });
      }
      await Promise.all(clients.map((client) => client.sync.clickSyncBtn()));
      await expect.poll(() => candidates.length).toBe(2);
      expect(new Set(candidates.map((candidate) => candidate.id)).size).toBe(2);
      expect(candidates.map((candidate) => candidate.entityId)).toEqual([
        `capture-${captureId}`,
        `capture-${captureId}`,
      ]);
      expect(await queue.countCaptureActorOperations({ userId: user.userId })).toBe(0);
      for (const client of clients) {
        await expect(client.page.locator('task').filter({ hasText: title })).toHaveCount(
          0,
        );
      }

      releasePublications();
      await expect.poll(() => outcomes.length).toBe(2);
      expect(outcomes.sort()).toEqual(['already_published', 'published']);
      for (const client of clients) {
        await expect(client.sync.syncSpinner).toBeHidden();
        await expect(client.page.locator('task').filter({ hasText: title })).toHaveCount(
          1,
        );
      }
      const receipt = await queue.readCaptureReceipt({ userId: user.userId, captureId });
      expect(receipt).not.toBeNull();
      expect(candidates.map((candidate) => candidate.id)).toContain(receipt!.opId);
      expect(await queue.countCaptureActorOperations({ userId: user.userId })).toBe(1);
      expect(
        await queue.readPendingCapture({ userId: user.userId, captureId }),
      ).toBeNull();
      for (const client of clients) await client.sync.syncAndWait();
      expect(await queue.readCaptureReceipt({ userId: user.userId, captureId })).toEqual(
        receipt,
      );
      expect(await queue.countCaptureActorOperations({ userId: user.userId })).toBe(1);
    } finally {
      releasePublications();
      for (const client of clients) await closeClient(client);
      await prisma.$disconnect();
    }
  });

  test('keeps a capture queued when its publishing tab closes before submission', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    const prisma = new PrismaClient();
    const queue = createAgentCapturePublicationHarness(prisma);
    let client: SimulatedE2EClient | undefined;
    let releasePublication = (): void => undefined;
    const released = new Promise<void>((resolve) => {
      releasePublication = resolve;
    });
    try {
      const user = await createTestUser(`${testRunId}-capture-tab-close`);
      client = await createSimulatedClient(browser, baseURL!, 'Closing-Tab', testRunId);
      await client.sync.setupSuperSync(getSuperSyncConfig(user));
      await client.sync.syncAndWait();
      await client.context.addInitScript(blockBackgroundSync);
      await client.page.evaluate(blockBackgroundSync);
      await client.page.goto('/#/project/INBOX_PROJECT/tasks');
      const captureId = `tab-close-${testRunId}`;
      const title = `Interrupted capture ${testRunId}`;
      await queue.enqueueCapture({ userId: user.userId, captureId, title });
      const closingPage = client.page;
      let publicationArrived = false;
      await closingPage.route('**/api/sync/captures/publish', async (route) => {
        publicationArrived = true;
        await released;
        if (!closingPage.isClosed()) await route.continue();
      });
      await client.sync.clickSyncBtn();
      await expect.poll(() => publicationArrived).toBe(true);
      await expect(closingPage.locator('task').filter({ hasText: title })).toHaveCount(0);
      await closingPage.close();
      releasePublication();
      expect(
        await queue.readCaptureReceipt({ userId: user.userId, captureId }),
      ).toBeNull();
      expect(await queue.countCaptureActorOperations({ userId: user.userId })).toBe(0);
      expect(
        await queue.readPendingCapture({ userId: user.userId, captureId }),
      ).not.toBeNull();

      // Reopen the same storage; ordinary sync must rebuild the abandoned candidate.
      client.page = await client.context.newPage();
      await client.page.goto(`${baseURL!}/#/project/INBOX_PROJECT/tasks`);
      await waitForAppReady(client.page);
      client.workView = new WorkViewPage(client.page, `Reopened-${testRunId}`);
      client.sync = new SuperSyncPage(client.page);
      await client.sync.syncAndWait();
      await expect(client.page.locator('task').filter({ hasText: title })).toHaveCount(1);
      expect(
        await queue.readCaptureReceipt({ userId: user.userId, captureId }),
      ).not.toBeNull();
      expect(await queue.countCaptureActorOperations({ userId: user.userId })).toBe(1);
      expect(
        await queue.readPendingCapture({ userId: user.userId, captureId }),
      ).toBeNull();
    } finally {
      releasePublication();
      if (client?.page.isClosed()) await client.context.close();
      else if (client) await closeClient(client);
      await prisma.$disconnect();
    }
  });
});

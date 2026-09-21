import { PrismaClient } from '@prisma/client';
import { test, expect } from '../../fixtures/supersync.fixture';
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
});

import { test, expect } from '../../fixtures/supersync.fixture';
import {
  createTestUser,
  getSuperSyncConfig,
  createSimulatedClient,
  closeClient,
  waitForTask,
  type SimulatedE2EClient,
} from '../../utils/supersync-helpers';
import { expectTaskVisible } from '../../utils/supersync-assertions';
import { SuperSyncPage } from '../../pages/supersync.page';
import { WorkViewPage } from '../../pages/work-view.page';
import { waitForStatePersistence } from '../../utils/waits';
import {
  createLegacyMigratedClient,
  closeLegacyClient,
} from '../../utils/legacy-migration-helpers';
import legacyDataClientB from '../../fixtures/legacy-migration-client-b.json';

/**
 * #9863: a device that already holds tasks joins a SuperSync account that another
 * device has already seeded. The pre-existing tasks must reach the other device.
 *
 * Two shapes of "pre-existing" data are covered:
 * 1. Tasks captured as regular op-log ops (install newer than v17).
 * 2. Tasks that live only in the legacy MIGRATION genesis op (install upgraded
 *    from a pre-op-log version).
 *
 * Run with: npm run e2e:supersync:file e2e/tests/sync/supersync-late-join-preexisting-9863.spec.ts
 */
test.describe('@supersync @issue-9863 Late joiner with pre-existing data', () => {
  test('pre-sync task captured as regular ops reaches the other client', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    let clientA: SimulatedE2EClient | null = null;
    let clientB: SimulatedE2EClient | null = null;
    try {
      const user = await createTestUser(testRunId);
      const syncConfig = getSuperSyncConfig(user);

      clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
      await clientA.sync.setupSuperSync(syncConfig);
      const taskA1 = `A1-${testRunId}`;
      await clientA.workView.addTask(taskA1);
      await clientA.sync.syncAndWait();

      clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
      const taskBPre = `BPre-${testRunId}`;
      await clientB.workView.addTask(taskBPre);
      await clientB.sync.setupSuperSync(syncConfig);
      await clientB.sync.syncAndWait();

      await waitForTask(clientB.page, taskA1);
      await expectTaskVisible(clientB, taskA1);
      await expectTaskVisible(clientB, taskBPre);

      await clientA.sync.syncAndWait();
      await waitForTask(clientA.page, taskBPre);
      await expectTaskVisible(clientA, taskBPre);
    } finally {
      if (clientA) await closeClient(clientA);
      if (clientB) await closeClient(clientB);
    }
  });

  test('pre-sync tasks from a legacy migration reach the other client', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    test.slow();
    const url = baseURL || 'http://localhost:4242';
    let clientA: SimulatedE2EClient | null = null;
    let clientB: Awaited<ReturnType<typeof createLegacyMigratedClient>> | null = null;
    try {
      const user = await createTestUser(testRunId);
      const syncConfig = getSuperSyncConfig(user);

      clientA = await createSimulatedClient(browser, url, 'A', testRunId);
      await clientA.sync.setupSuperSync(syncConfig);
      const taskA1 = `A1-${testRunId}`;
      await clientA.workView.addTask(taskA1);
      await clientA.sync.syncAndWait();

      clientB = await createLegacyMigratedClient(
        browser,
        url,
        legacyDataClientB.data,
        'B',
      );
      const syncPageB = new SuperSyncPage(clientB.page);
      const workViewB = new WorkViewPage(clientB.page);
      const sidenavB = clientB.page.locator('magic-side-nav');
      await sidenavB.locator('nav-item', { hasText: 'Client B Project' }).click();
      await workViewB.waitForTaskList();
      await expect(clientB.page.locator('task', { hasText: 'Task B1' })).toBeVisible({
        timeout: 10000,
      });
      clientB.page.on('dialog', async (dialog) => {
        console.log('[9863-legacy] native dialog: ' + dialog.message());
        await dialog.accept();
      });
      await syncPageB.setupSuperSync(syncConfig);
      await waitForStatePersistence(clientB.page);
      await syncPageB.syncAndWait();

      const bHasA1 = await clientB.page
        .locator('task', { hasText: taskA1 })
        .isVisible()
        .catch(() => false);
      const bStillHasB1 = await clientB.page
        .locator('task', { hasText: 'Task B1' })
        .isVisible()
        .catch(() => false);
      console.log(
        `[9863-legacy] after B sync: bHasA1=${bHasA1} bStillHasB1=${bStillHasB1}`,
      );

      await clientA.sync.syncAndWait();
      await clientA.page.waitForTimeout(1500);
      const sidenavA = clientA.page.locator('magic-side-nav');
      await expect(
        sidenavA.locator('nav-item', { hasText: 'Client B Project' }),
      ).toBeVisible({ timeout: 10000 });
    } finally {
      if (clientA) await closeClient(clientA);
      if (clientB) await closeLegacyClient(clientB).catch(() => {});
    }
  });
});

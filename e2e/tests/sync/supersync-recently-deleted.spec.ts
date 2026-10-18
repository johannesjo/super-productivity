import { test, expect } from '../../fixtures/supersync.fixture';
import type { Page } from '@playwright/test';
import {
  createTestUser,
  getSuperSyncConfig,
  createSimulatedClient,
  closeClient,
  waitForTask,
  type SimulatedE2EClient,
} from '../../utils/supersync-helpers';

/**
 * Recently deleted across devices (#2778).
 *
 * The trash is device-local but fed by the delete ops every client receives,
 * and a restore goes out as the existing `restoreTask` action. So a task
 * deleted on A can be restored from B's "Recently deleted", and A gets it back.
 *
 * Run with: npm run e2e:supersync:file e2e/tests/sync/supersync-recently-deleted.spec.ts
 */

const deleteTaskViaContextMenu = async (page: Page, title: string): Promise<void> => {
  const task = page.locator('task').filter({ hasText: title }).first();
  await task.locator('task-title').first().click({ button: 'right' });
  await page.locator('.mat-mdc-menu-content button.color-warn').click();
  await page.locator('dialog-confirm button[e2e="confirmBtn"]').click();
  await expect(page.locator('task').filter({ hasText: title })).toHaveCount(0);
};

const openRecentlyDeleted = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    window.location.hash = '#/tag/TODAY/history';
  });
  await page.locator('history .recently-deleted-btn').click();
  await page.locator('dialog-recently-deleted').waitFor({ state: 'visible' });
};

const closeRecentlyDeleted = async (page: Page): Promise<void> => {
  await page.locator('dialog-recently-deleted button[mat-dialog-close]').click();
  await page.locator('dialog-recently-deleted').waitFor({ state: 'hidden' });
  await page.evaluate(() => {
    window.location.hash = '#/tag/TODAY/tasks';
  });
  await page.waitForURL(/tag\/TODAY\/tasks/);
};

test.describe('@supersync Recently deleted', () => {
  test('a task deleted on A is restored from B and comes back on A', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    test.setTimeout(180000);
    const appUrl = baseURL || 'http://localhost:4242';
    let clientA: SimulatedE2EClient | null = null;
    let clientB: SimulatedE2EClient | null = null;

    try {
      const user = await createTestUser(testRunId);
      const syncConfig = getSuperSyncConfig(user);
      const title = `Trash-${testRunId}`;

      clientA = await createSimulatedClient(browser, appUrl, 'A', testRunId);
      await clientA.sync.setupSuperSync(syncConfig);
      await clientA.workView.addTask(title);
      await waitForTask(clientA.page, title);
      await clientA.sync.syncAndWait();

      clientB = await createSimulatedClient(browser, appUrl, 'B', testRunId);
      await clientB.sync.setupSuperSync(syncConfig);
      await clientB.sync.syncAndWait();
      await waitForTask(clientB.page, title);

      // A deletes, B receives the delete.
      await deleteTaskViaContextMenu(clientA.page, title);
      await clientA.sync.syncAndWait();
      await clientB.sync.syncAndWait();
      await expect(clientB.page.locator('task').filter({ hasText: title })).toHaveCount(
        0,
      );

      // B finds the remote delete in its own trash and restores it.
      await openRecentlyDeleted(clientB.page);
      const entryOnB = clientB.page
        .locator('dialog-recently-deleted .entry')
        .filter({ hasText: title });
      await expect(entryOnB).toBeVisible();
      await entryOnB.locator('.restore-btn').click();
      await expect(entryOnB).toHaveCount(0);
      await closeRecentlyDeleted(clientB.page);
      await waitForTask(clientB.page, title);
      await clientB.sync.syncAndWait();

      // A gets the restore, and its own trash entry is gone.
      await clientA.sync.syncAndWait();
      await waitForTask(clientA.page, title);
      await openRecentlyDeleted(clientA.page);
      await expect(
        clientA.page.locator('dialog-recently-deleted .entry').filter({ hasText: title }),
      ).toHaveCount(0);
    } finally {
      if (clientA) await closeClient(clientA);
      if (clientB) await closeClient(clientB);
    }
  });
});

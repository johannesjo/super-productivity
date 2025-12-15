import { test as base, expect, Page } from '@playwright/test';
import {
  createTestUser,
  getSuperSyncConfig,
  createSimulatedClient,
  closeClient,
  waitForTask,
  isServerHealthy,
  type SimulatedE2EClient,
} from '../../utils/supersync-helpers';

/**
 * SuperSync Repeatable Task E2E Tests
 *
 * Verifies that repeatable task instances sync correctly between clients,
 * especially after import operations.
 */

const generateTestRunId = (workerIndex: number): string => {
  return `${Date.now()}-${workerIndex}`;
};

// Helper to create a repeatable task configuration
const createRepeatTask = async (page: Page, taskName: string): Promise<void> => {
  // Navigate to work view
  await page.goto('/#/tag/TODAY/work');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Add a task
  const addTaskBtn = page.locator('add-task-bar input');
  await addTaskBtn.waitFor({ state: 'visible' });
  await addTaskBtn.fill(taskName);
  await addTaskBtn.press('Enter');
  await page.waitForTimeout(500);

  // Find the task and open context menu
  const task = page.locator(`task:has-text("${taskName}")`).first();
  await task.waitFor({ state: 'visible' });
  await task.click({ button: 'right' });

  // Click "Schedule..." to open scheduling dialog
  const scheduleItem = page.locator('.mat-mdc-menu-item').filter({ hasText: 'Schedule' });
  await scheduleItem.click();

  // Wait for dialog
  const dialog = page.locator('dialog-schedule-task');
  await dialog.waitFor({ state: 'visible' });

  // Click "Repeat" to set up repeat configuration
  const repeatBtn = dialog.locator('button').filter({ hasText: 'Repeat' });
  if (await repeatBtn.isVisible()) {
    await repeatBtn.click();
    await page.waitForTimeout(300);
  }

  // Select "Daily" repeat
  const dailyOption = dialog.locator('mat-button-toggle').filter({ hasText: 'Daily' });
  if (await dailyOption.isVisible()) {
    await dailyOption.click();
    await page.waitForTimeout(300);
  }

  // Save the dialog
  const saveBtn = dialog.locator('button[type="submit"]');
  await saveBtn.click();

  // Wait for dialog to close
  await dialog.waitFor({ state: 'hidden', timeout: 5000 });
  await page.waitForTimeout(500);
};

base.describe('@supersync SuperSync Repeatable Task Sync', () => {
  let serverHealthy: boolean | null = null;

  base.beforeEach(async ({}, testInfo) => {
    if (serverHealthy === null) {
      serverHealthy = await isServerHealthy();
      if (!serverHealthy) {
        console.warn(
          'SuperSync server not healthy at http://localhost:1900 - skipping tests',
        );
      }
    }
    testInfo.skip(!serverHealthy, 'SuperSync server not running');
  });

  /**
   * Scenario: Repeatable Task Instance Syncs to Second Client
   *
   * This test verifies that when Client A creates a repeatable task,
   * the generated task instance syncs correctly to Client B.
   *
   * Actions:
   * 1. Client A creates a task and sets it as daily repeat
   * 2. Client A syncs
   * 3. Client B syncs
   * 4. Verify Client B has the task
   */
  base(
    'Repeatable task instance syncs to second client',
    async ({ browser, baseURL }, testInfo) => {
      testInfo.setTimeout(90000);
      const testRunId = generateTestRunId(testInfo.workerIndex);
      const appUrl = baseURL || 'http://localhost:4242';
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // Setup Client A
        clientA = await createSimulatedClient(browser, appUrl, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        // Setup Client B
        clientB = await createSimulatedClient(browser, appUrl, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);

        // 1. Client A creates a repeatable task
        const taskName = `RepeatTask-${testRunId}`;
        await createRepeatTask(clientA.page, taskName);

        // Verify task exists on Client A
        await waitForTask(clientA.page, taskName);

        // 2. Client A syncs
        await clientA.sync.syncAndWait();

        // 3. Client B syncs
        await clientB.sync.syncAndWait();

        // 4. Verify Client B has the task
        // Wait for UI to update
        await clientB.page.waitForTimeout(1000);

        // The task should appear on Client B's today list
        const taskOnB = clientB.page.locator(`task:has-text("${taskName}")`).first();
        await expect(taskOnB).toBeVisible({ timeout: 10000 });

        console.log(
          '[RepeatTaskSync] ✓ Repeatable task synced successfully to second client',
        );
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );

  /**
   * Scenario: Repeatable Task After Full Sync Import
   *
   * This test verifies the specific edge case where a repeatable task
   * is created shortly after a full sync import, ensuring the task
   * instance is not filtered out due to UUIDv7 timing issues.
   *
   * Actions:
   * 1. Client A sets up sync (triggers initial SYNC_IMPORT)
   * 2. Client A immediately creates a repeatable task
   * 3. Client A syncs
   * 4. Client B (fresh) sets up sync
   * 5. Verify Client B receives the task instance
   */
  base(
    'Repeatable task created after import syncs correctly',
    async ({ browser, baseURL }, testInfo) => {
      testInfo.setTimeout(120000);
      const testRunId = generateTestRunId(testInfo.workerIndex);
      const appUrl = baseURL || 'http://localhost:4242';
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // 1. Client A sets up sync (triggers initial sync)
        clientA = await createSimulatedClient(browser, appUrl, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        // 2. Immediately create a repeatable task (simulates the edge case)
        const taskName = `RepeatAfterImport-${testRunId}`;
        await createRepeatTask(clientA.page, taskName);

        // Verify task on Client A
        await waitForTask(clientA.page, taskName);

        // 3. Client A syncs to upload the task
        await clientA.sync.syncAndWait();

        // 4. Client B (fresh setup) joins
        clientB = await createSimulatedClient(browser, appUrl, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);

        // Wait for sync to complete
        await clientB.sync.syncAndWait();

        // 5. Verify Client B has the task instance
        await clientB.page.waitForTimeout(1000);

        const taskOnB = clientB.page.locator(`task:has-text("${taskName}")`).first();
        await expect(taskOnB).toBeVisible({ timeout: 15000 });

        // Verify it's the same task (not a duplicate created by Client B)
        const taskCount = await clientB.page
          .locator(`task:has-text("${taskName}")`)
          .count();
        expect(taskCount).toBe(1);

        console.log('[RepeatAfterImport] ✓ Task created after import synced correctly');
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );
});

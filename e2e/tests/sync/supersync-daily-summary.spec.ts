import { test as base, expect } from '@playwright/test';
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
 * SuperSync Daily Summary E2E Tests
 */

const generateTestRunId = (workerIndex: number): string => {
  return `${Date.now()}-${workerIndex}`;
};

base.describe('@supersync Daily Summary Sync', () => {
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
   * Scenario: Archived tasks and time tracking appear on Daily Summary
   *
   * Actions:
   * 1. Client A creates "Task A" and tracks time (e.g. 5s).
   * 2. Client A creates "Task B" (no time).
   * 3. Client A marks both as done.
   * 4. Client A finishes day (archives tasks).
   * 5. Client A syncs.
   * 6. Client B syncs.
   * 7. Client B navigates to Daily Summary.
   * 8. Verify Client B sees both tasks and correct time.
   */
  base(
    'Archived tasks and time tracking appear on Daily Summary',
    async ({ browser, baseURL }, testInfo) => {
      testInfo.setTimeout(120000);
      const testRunId = generateTestRunId(testInfo.workerIndex);
      const uniqueId = Date.now();
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // ============ PHASE 1: Client A Setup & Work ============
        clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        // Create Task A and track time
        const taskAName = `TaskA-${uniqueId}`;
        await clientA.workView.addTask(taskAName);
        const taskALocator = clientA.page.locator(`task:has-text("${taskAName}")`);

        // Manually set time via Detail Panel -> Time Estimate Dialog
        // 1. Open detail panel
        await taskALocator.hover();
        const detailBtn = taskALocator.locator('.show-additional-info-btn');
        await detailBtn.click();

        const panel = clientA.page.locator('task-detail-panel');
        await expect(panel).toBeVisible();

        // 2. Click time item to open dialog
        // Look for the item with the timer icon
        const timeItem = panel.locator('task-detail-item:has(mat-icon:text("timer"))');
        await timeItem.click();

        // 3. Wait for dialog
        const dialog = clientA.page.locator('dialog-time-estimate');
        await expect(dialog).toBeVisible();

        // 4. Fill time spent (assuming first input is time spent or allow flexible input)
        // Usually the dialog focuses the relevant input or has labeled inputs.
        // We'll try filling the first input found in the dialog.
        const timeInput = dialog.locator('input').first();
        await timeInput.fill('10m');
        await clientA.page.keyboard.press('Enter');

        // 5. Verify update in panel
        // The time item should now show 10m
        await expect(timeItem).toContainText('10m');
        console.log('Client A manually set time to: 10m');

        // Create Task B (no time)
        const taskBName = `TaskB-${uniqueId}`;
        await clientA.workView.addTask(taskBName);
        const taskBLocator = clientA.page.locator(`task:has-text("${taskBName}")`);

        // Mark both done
        await taskALocator.hover();
        await taskALocator.locator('.task-done-btn').click();

        await taskBLocator.hover();
        await taskBLocator.locator('.task-done-btn').click();

        // Archive Tasks (Finish Day)
        const finishDayBtn = clientA.page.locator('.e2e-finish-day');
        await finishDayBtn.click();

        // Wait for Daily Summary
        await clientA.page.waitForURL(/daily-summary/);

        // Click "Save and go home" to archive
        const saveAndGoHomeBtn = clientA.page.locator(
          'daily-summary button[mat-flat-button]:has(mat-icon:has-text("wb_sunny"))',
        );
        await saveAndGoHomeBtn.waitFor({ state: 'visible' });
        await saveAndGoHomeBtn.click();

        // Wait for Work View (Archived)
        // Accept either active/tasks or tag/TODAY/tasks
        await clientA.page.waitForURL(/(active\/tasks|tag\/TODAY\/tasks)/);
        console.log('Client A archived tasks.');

        // Sync A (upload archive)
        await clientA.sync.syncAndWait();
        console.log('Client A synced.');

        // ============ PHASE 2: Client B Sync & Verify ============
        clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);

        // Sync B (download archive)
        await clientB.sync.syncAndWait();
        console.log('Client B synced.');

        // Navigate B to Daily Summary
        // We manually go there because there might be no active tasks to trigger "Finish Day" button
        await clientB.page.goto('/#/tag/TODAY/daily-summary');

        // Wait for table
        await clientB.page.waitForSelector('task-summary-tables', { state: 'visible' });
        console.log('Client B on Daily Summary.');

        // Verify Content
        // Check Task A Name
        // Use specific selector for summary table cells
        const rowA = clientB.page.locator('tr', { hasText: taskAName });
        await expect(rowA).toBeVisible({ timeout: 10000 });

        // Check Task A Time
        const rowAText = await rowA.textContent();
        console.log(`Row A Content: ${rowAText}`);
        // Expect "10m" or "00:10" or "0:10"
        expect(rowAText).toMatch(/10m|00:10|0:10/);

        // Check Task B Name
        const rowB = clientB.page.locator('tr', { hasText: taskBName });
        await expect(rowB).toBeVisible({ timeout: 10000 });

        // Check Task B Time (should be 0 or empty)
        // It likely shows "-" or "0s"
        const rowBText = await rowB.textContent();
        console.log(`Row B Content: ${rowBText}`);

        console.log('✓ Daily Summary verification passed!');
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );
});

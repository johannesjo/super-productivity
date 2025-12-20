import { test as base, expect } from '@playwright/test';
import {
  createTestUser,
  getSuperSyncConfig,
  createSimulatedClient,
  closeClient,
  isServerHealthy,
  type SimulatedE2EClient,
} from '../../utils/supersync-helpers';

/**
 * SuperSync Stress Tests
 *
 * High-volume tests that verify bulk sync operations.
 * These tests are separated from edge-cases due to:
 * - Longer timeouts (up to 5 minutes)
 * - Higher operation counts
 * - Need for quieter logging
 */

const generateTestRunId = (workerIndex: number): string => {
  return `${Date.now()}-${workerIndex}`;
};

/**
 * Create a simulated client with quiet console logging.
 * Only errors are logged, other console output is suppressed.
 */
const createQuietClient = async (
  browser: Parameters<typeof createSimulatedClient>[0],
  appUrl: string,
  clientName: string,
  testPrefix: string,
): Promise<SimulatedE2EClient> => {
  const client = await createSimulatedClient(browser, appUrl, clientName, testPrefix);

  // Remove default listeners and add quiet one (only errors)
  client.page.removeAllListeners('console');
  client.page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[Client ${clientName}] Error:`, msg.text());
    }
  });

  return client;
};

base.describe('@supersync SuperSync Stress Tests', () => {
  let serverHealthy: boolean | null = null;

  base.beforeEach(async ({}, testInfo) => {
    if (serverHealthy === null) {
      serverHealthy = await isServerHealthy();
      if (!serverHealthy) {
        console.warn(
          'SuperSync server not healthy at http://localhost:1901 - skipping tests',
        );
      }
    }
    testInfo.skip(!serverHealthy, 'SuperSync server not running');
  });

  /**
   * Scenario: Bulk Sync (Slow Device Recovery)
   *
   * Tests that many operations sync correctly without causing cascade conflicts.
   * This verifies the fix for the "slow device cascade" problem where user
   * interactions during sync would create operations with stale vector clocks.
   *
   * Actions:
   * 1. Client A creates many tasks (simulating a day's work)
   * 2. Client B syncs (downloads all operations at once)
   * 3. Verify B has all tasks from A
   * 4. Verify no spurious conflicts or errors
   */
  base(
    'Bulk sync: Many operations sync without cascade conflicts',
    async ({ browser, baseURL }, testInfo) => {
      testInfo.setTimeout(120000); // Bulk operations need more time
      const testRunId = generateTestRunId(testInfo.workerIndex);
      const appUrl = baseURL || 'http://localhost:4242';
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // Setup Client A (quiet mode)
        clientA = await createQuietClient(browser, appUrl, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        // 1. Client A creates many tasks (simulating a day's work)
        const taskCount = 10;
        const taskNames: string[] = [];

        console.log(`[BulkSync] Creating ${taskCount} tasks...`);

        for (let i = 1; i <= taskCount; i++) {
          const taskName = `BulkTask-${i}-${testRunId}`;
          taskNames.push(taskName);
          // Use skipClose=true for faster creation
          await clientA.workView.addTask(taskName, i < taskCount);
        }

        // Verify tasks were created
        const createdCount = await clientA.page.locator('task').count();
        expect(createdCount).toBeGreaterThanOrEqual(taskCount);
        console.log(`[BulkSync] Created ${createdCount} tasks`);

        // Mark some tasks as done using correct selector (need hover to show button)
        for (let i = 0; i < 3; i++) {
          const taskLocator = clientA.page
            .locator(`task:has-text("${taskNames[i]}")`)
            .first();
          await taskLocator.hover();
          await taskLocator.locator('.task-done-btn').click();
          await clientA.page.waitForTimeout(100);
        }
        console.log('[BulkSync] Marked 3 tasks as done');

        // Sync all changes from A
        await clientA.sync.syncAndWait();
        console.log('[BulkSync] Client A synced');

        // 2. Setup Client B and sync (downloads all operations at once)
        clientB = await createQuietClient(browser, appUrl, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);
        await clientB.sync.syncAndWait();
        console.log('[BulkSync] Client B synced (bulk download)');

        // Wait for UI to settle after bulk sync
        await clientB.page.waitForTimeout(2000);

        // 3. Verify B has all tasks from A
        const taskCountB = await clientB.page
          .locator(`task:has-text("${testRunId}")`)
          .count();
        expect(taskCountB).toBe(taskCount);
        console.log(`[BulkSync] Client B has all ${taskCount} tasks`);

        // Verify done status of first 3 tasks
        for (let i = 0; i < 3; i++) {
          const taskLocator = clientB.page
            .locator(`task:not(.ng-animating):has-text("${taskNames[i]}")`)
            .first();
          await expect(taskLocator).toHaveClass(/isDone/, { timeout: 5000 });
        }
        console.log('[BulkSync] Done status verified on Client B');

        // 4. Do another round of sync to verify no spurious conflicts
        await clientA.sync.syncAndWait();
        await clientB.sync.syncAndWait();

        // Verify counts still match
        const finalCountA = await clientA.page
          .locator(`task:has-text("${testRunId}")`)
          .count();
        const finalCountB = await clientB.page
          .locator(`task:has-text("${testRunId}")`)
          .count();
        expect(finalCountA).toBe(taskCount);
        expect(finalCountB).toBe(taskCount);

        console.log('[BulkSync] Bulk sync completed without cascade conflicts');
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );

  /**
   * Scenario: High Volume Sync (499 Operations)
   *
   * Tests that the system can handle a large number of operations (499)
   * right at the edge before the COMPACTION_THRESHOLD (500) triggers.
   * This verifies the operation log can handle high-volume syncs without issues.
   *
   * Actions:
   * 1. Client A creates 250 tasks (250 operations)
   * 2. Client A marks 249 tasks as done (249 more operations = 499 total)
   * 3. Client A syncs all 499 operations
   * 4. Client B syncs (bulk download of 499 operations)
   * 5. Verify B has all 250 tasks with correct done states
   */
  base(
    'High volume sync: 499 operations sync correctly',
    async ({ browser, baseURL }, testInfo) => {
      testInfo.setTimeout(300000); // 5 minutes for this stress test
      const testRunId = generateTestRunId(testInfo.workerIndex);
      const appUrl = baseURL || 'http://localhost:4242';
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // Setup Client A (quiet mode)
        clientA = await createQuietClient(browser, appUrl, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        // Create 250 tasks (250 operations)
        const taskCount = 250;
        const taskNames: string[] = [];

        console.log(`[HighVolume] Creating ${taskCount} tasks...`);

        for (let i = 1; i <= taskCount; i++) {
          const taskName = `HighVol-${i}-${testRunId}`;
          taskNames.push(taskName);
          // Use skipClose=true for faster creation, only close on last task
          await clientA.workView.addTask(taskName, i < taskCount);

          // Progress logging and browser settling every 50 tasks
          if (i % 50 === 0) {
            console.log(`[HighVolume] Created ${i}/${taskCount} tasks`);
            await clientA.page.waitForTimeout(500); // Let browser settle
          }
        }

        // Verify tasks created
        const createdCount = await clientA.page.locator('task').count();
        expect(createdCount).toBeGreaterThanOrEqual(taskCount);
        console.log(`[HighVolume] Created ${createdCount} tasks total`);

        // Mark 249 tasks as done (249 more operations = 499 total)
        console.log('[HighVolume] Marking 249 tasks as done...');
        for (let i = 0; i < 249; i++) {
          const taskLocator = clientA.page
            .locator(`task:has-text("${taskNames[i]}")`)
            .first();
          await taskLocator.hover();
          await taskLocator.locator('.task-done-btn').click();
          // Minimal wait between clicks
          await clientA.page.waitForTimeout(50);

          // Progress logging and browser settling every 50 tasks
          if ((i + 1) % 50 === 0) {
            console.log(`[HighVolume] Marked ${i + 1}/249 tasks as done`);
            await clientA.page.waitForTimeout(500); // Let browser settle
          }
        }
        console.log('[HighVolume] All 499 operations created locally');

        // Sync all changes from A
        await clientA.sync.syncAndWait();
        console.log('[HighVolume] Client A synced 499 operations');

        // Setup Client B and sync (bulk download)
        clientB = await createQuietClient(browser, appUrl, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);
        await clientB.sync.syncAndWait();
        console.log('[HighVolume] Client B synced (bulk download)');

        // Wait for UI to settle after bulk sync
        await clientB.page.waitForTimeout(3000);

        // Verify all tasks exist on B
        const taskCountB = await clientB.page
          .locator(`task:has-text("${testRunId}")`)
          .count();
        expect(taskCountB).toBe(taskCount);
        console.log(`[HighVolume] Client B has all ${taskCount} tasks`);

        // Verify done status (249 should be done, 1 should be open)
        const doneCount = await clientB.page
          .locator(`task.isDone:has-text("${testRunId}")`)
          .count();
        expect(doneCount).toBe(249);
        console.log('[HighVolume] Done states verified on Client B');

        console.log('[HighVolume] 499 operations applied successfully');
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );
});

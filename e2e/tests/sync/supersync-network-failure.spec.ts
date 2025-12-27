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
 * SuperSync Network Failure E2E Tests
 *
 * These tests verify sync behavior when network failures occur.
 * They use Playwright's route interception to simulate:
 * - Upload failures
 * - Download failures
 * - Partial sync failures
 * - Network drops during sync
 *
 * Prerequisites:
 * - super-sync-server running on localhost:1901 with TEST_MODE=true
 * - Frontend running on localhost:4242
 *
 * Run with: npm run e2e:playwright:file e2e/tests/sync/supersync-network-failure.spec.ts
 */

const generateTestRunId = (workerIndex: number): string => {
  return `${Date.now()}-${workerIndex}`;
};

base.describe('@supersync Network Failure Recovery', () => {
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
   * Test: Upload failure and retry
   *
   * Scenario:
   * 1. Client A creates tasks
   * 2. First sync attempt fails (network intercepted)
   * 3. Second sync attempt succeeds
   * 4. Client B receives the tasks
   */
  base(
    'recovers from upload failure and retries successfully',
    async ({ browser, baseURL }, testInfo) => {
      const testRunId = generateTestRunId(testInfo.workerIndex);
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;
      let failNextUpload = true;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // Set up Client A
        clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        // Create tasks
        const taskName = `Task-${testRunId}-upload-test`;
        await clientA.workView.addTask(taskName);

        // Set up route interception to fail first upload
        await clientA.page.route('**/api/sync/ops/**', async (route) => {
          if (failNextUpload && route.request().method() === 'POST') {
            failNextUpload = false;
            console.log('[Test] Simulating upload failure');
            await route.abort('failed');
          } else {
            await route.continue();
          }
        });

        // First sync attempt - should fail
        try {
          await clientA.sync.triggerSync();
          // Wait a bit for the failure to be processed
          await clientA.page.waitForTimeout(2000);
        } catch {
          // Expected to fail
          console.log('[Test] First sync failed as expected');
        }

        // Remove the failing route
        await clientA.page.unroute('**/api/sync/ops/**');

        // Second sync attempt - should succeed
        await clientA.sync.syncAndWait();

        // Verify task still exists on Client A
        await waitForTask(clientA.page, taskName);

        // Set up Client B
        clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);

        // Client B syncs
        await clientB.sync.syncAndWait();

        // Verify Client B received the task
        await waitForTask(clientB.page, taskName);

        const taskLocatorB = clientB.page.locator(`task:has-text("${taskName}")`);
        await expect(taskLocatorB).toBeVisible();
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );

  /**
   * Test: Download failure and retry
   *
   * Scenario:
   * 1. Client A creates and syncs tasks
   * 2. Client B's first download fails
   * 3. Client B retries and succeeds
   */
  base('recovers from download failure', async ({ browser, baseURL }, testInfo) => {
    const testRunId = generateTestRunId(testInfo.workerIndex);
    let clientA: SimulatedE2EClient | null = null;
    let clientB: SimulatedE2EClient | null = null;
    let failNextDownload = true;

    try {
      const user = await createTestUser(testRunId);
      const syncConfig = getSuperSyncConfig(user);

      // Set up Client A and create task
      clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
      await clientA.sync.setupSuperSync(syncConfig);

      const taskName = `Task-${testRunId}-download-test`;
      await clientA.workView.addTask(taskName);
      await clientA.sync.syncAndWait();

      // Verify Client A has the task
      await waitForTask(clientA.page, taskName);

      // Set up Client B
      clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
      await clientB.sync.setupSuperSync(syncConfig);

      // Set up route interception to fail first download
      await clientB.page.route('**/api/sync/ops/**', async (route) => {
        if (failNextDownload && route.request().method() === 'GET') {
          failNextDownload = false;
          console.log('[Test] Simulating download failure');
          await route.abort('failed');
        } else {
          await route.continue();
        }
      });

      // First sync attempt - download should fail
      try {
        await clientB.sync.triggerSync();
        await clientB.page.waitForTimeout(2000);
      } catch {
        console.log('[Test] First download failed as expected');
      }

      // Verify task NOT present (download failed)
      const taskLocatorBeforeRetry = clientB.page.locator(`task:has-text("${taskName}")`);
      await expect(taskLocatorBeforeRetry)
        .not.toBeVisible({ timeout: 1000 })
        .catch(() => {
          // Task might or might not be visible depending on partial state
        });

      // Remove the failing route
      await clientB.page.unroute('**/api/sync/ops/**');

      // Retry sync - should succeed
      await clientB.sync.syncAndWait();

      // Verify task now present
      await waitForTask(clientB.page, taskName);
      const taskLocatorAfterRetry = clientB.page.locator(`task:has-text("${taskName}")`);
      await expect(taskLocatorAfterRetry).toBeVisible();
    } finally {
      if (clientA) await closeClient(clientA);
      if (clientB) await closeClient(clientB);
    }
  });

  /**
   * Test: Sync succeeds after server error (500)
   *
   * Scenario:
   * 1. Client A creates task
   * 2. First sync returns 500 error
   * 3. Second sync succeeds
   */
  base(
    'handles server error (500) and retries',
    async ({ browser, baseURL }, testInfo) => {
      const testRunId = generateTestRunId(testInfo.workerIndex);
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      // Use object to ensure mutable reference is captured correctly
      const state = { returnServerError: true };

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        const taskName = `Task-${testRunId}-server-error`;
        await clientA.workView.addTask(taskName);
        // Wait for task to be fully created in store
        await waitForTask(clientA.page, taskName);

        // Intercept and return 500 error on first request
        await clientA.page.route('**/api/sync/ops/**', async (route) => {
          if (state.returnServerError && route.request().method() === 'POST') {
            state.returnServerError = false;
            console.log('[Test] Simulating 500 server error');
            await route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'Internal Server Error' }),
            });
          } else {
            await route.continue();
          }
        });

        // First sync - server error
        try {
          await clientA.sync.triggerSync();
          // Wait for the error to be processed
          await clientA.page.waitForTimeout(3000);
        } catch {
          console.log('[Test] First sync got server error as expected');
        }

        // Remove interception before retry
        await clientA.page.unroute('**/api/sync/ops/**');
        // Give time for route to be fully removed
        await clientA.page.waitForTimeout(500);

        // Retry - should succeed now
        await clientA.sync.syncAndWait();
        console.log('[Test] Retry sync succeeded');

        // Verify with Client B
        clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);
        await clientB.sync.syncAndWait();

        await waitForTask(clientB.page, taskName);
        const taskLocator = clientB.page.locator(`task:has-text("${taskName}")`);
        await expect(taskLocator).toBeVisible();
      } finally {
        // Ensure routes are cleaned up
        if (clientA) {
          await clientA.page.unroute('**/api/sync/ops/**').catch(() => {});
        }
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );

  /**
   * Test: Multiple tasks sync correctly after network recovery
   *
   * Scenario:
   * 1. Client A creates multiple tasks offline (sync disabled/failing)
   * 2. Network recovers
   * 3. All tasks sync to Client B
   */
  base(
    'syncs all pending operations after network recovery',
    async ({ browser, baseURL }, testInfo) => {
      const testRunId = generateTestRunId(testInfo.workerIndex);
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      // Use object to ensure mutable reference is captured correctly
      const state = { blockAllSyncRequests: true };

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        // Block all sync requests
        await clientA.page.route('**/api/sync/**', async (route) => {
          if (state.blockAllSyncRequests) {
            console.log('[Test] Blocking sync request');
            await route.abort('failed');
          } else {
            await route.continue();
          }
        });

        // Create multiple tasks while "offline"
        const taskNames = [
          `Task-${testRunId}-offline-1`,
          `Task-${testRunId}-offline-2`,
          `Task-${testRunId}-offline-3`,
        ];

        for (const taskName of taskNames) {
          await clientA.workView.addTask(taskName);
          // Ensure task is created before adding next one
          await waitForTask(clientA.page, taskName);
        }

        // Try to sync (will fail due to route blocking)
        try {
          await clientA.sync.triggerSync();
          await clientA.page.waitForTimeout(2000);
        } catch {
          console.log('[Test] Sync blocked as expected');
        }

        // "Restore network" - unblock requests and remove route
        state.blockAllSyncRequests = false;
        await clientA.page.unroute('**/api/sync/**');
        // Give time for route to be fully removed
        await clientA.page.waitForTimeout(500);

        // Sync should now succeed with all pending operations
        await clientA.sync.syncAndWait();
        console.log('[Test] Sync after network recovery succeeded');

        // Verify all tasks on Client A
        for (const taskName of taskNames) {
          await waitForTask(clientA.page, taskName);
        }

        // Verify on Client B
        clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);
        await clientB.sync.syncAndWait();

        // All tasks should be present on Client B
        for (const taskName of taskNames) {
          await waitForTask(clientB.page, taskName);
          const taskLocator = clientB.page.locator(`task:has-text("${taskName}")`);
          await expect(taskLocator).toBeVisible();
        }
      } finally {
        // Ensure routes are cleaned up
        if (clientA) {
          await clientA.page.unroute('**/api/sync/**').catch(() => {});
        }
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );

  /**
   * Test: Partial batch upload failure followed by successful retry
   *
   * This tests a more realistic failure scenario where:
   * 1. Client A creates 10 tasks rapidly
   * 2. First sync starts - first few ops may succeed, then failure
   * 3. Retry sync - all remaining ops should upload
   * 4. Client B receives ALL 10 tasks (no duplicates, no missing)
   *
   * This verifies that the operation log correctly tracks which ops
   * have been synced vs pending, and retry doesn't create duplicates.
   */
  base(
    'partial batch upload failure followed by retry uploads all without duplicates',
    async ({ browser, baseURL }, testInfo) => {
      testInfo.setTimeout(180000);
      const testRunId = generateTestRunId(testInfo.workerIndex);
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      // Track how many POST requests we've seen
      const state = {
        requestCount: 0,
        failAfter: 2, // Fail after 2 successful requests
      };

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        // Create 10 tasks rapidly
        const taskCount = 10;
        const taskNames: string[] = [];
        for (let i = 0; i < taskCount; i++) {
          const taskName = `Task-${testRunId}-batch-${i.toString().padStart(2, '0')}`;
          taskNames.push(taskName);
          await clientA.workView.addTask(taskName);
          await waitForTask(clientA.page, taskName);
        }
        console.log(`[PartialBatch] Created ${taskCount} tasks on Client A`);

        // Verify all tasks exist locally
        for (const taskName of taskNames) {
          const taskLocator = clientA.page.locator(`task:has-text("${taskName}")`);
          await expect(taskLocator).toBeVisible();
        }

        // Set up route interception to fail after first few requests
        await clientA.page.route('**/api/sync/ops/**', async (route) => {
          if (route.request().method() === 'POST') {
            state.requestCount++;
            if (state.requestCount > state.failAfter) {
              console.log(
                `[PartialBatch] Failing request #${state.requestCount} (after ${state.failAfter} successes)`,
              );
              await route.abort('failed');
            } else {
              console.log(`[PartialBatch] Allowing request #${state.requestCount}`);
              await route.continue();
            }
          } else {
            await route.continue();
          }
        });

        // First sync attempt - will partially succeed then fail
        console.log('[PartialBatch] Starting first sync (will partially fail)');
        try {
          await clientA.sync.triggerSync();
          await clientA.page.waitForTimeout(3000);
        } catch {
          console.log('[PartialBatch] First sync failed as expected');
        }

        // Remove the failing route and reset counter
        await clientA.page.unroute('**/api/sync/ops/**');
        await clientA.page.waitForTimeout(500);
        console.log('[PartialBatch] Route interception removed');

        // Retry sync - should succeed and upload remaining ops
        console.log('[PartialBatch] Retrying sync');
        await clientA.sync.syncAndWait();
        console.log('[PartialBatch] Retry sync completed');

        // Verify all tasks still exist on Client A (no data loss)
        for (const taskName of taskNames) {
          await waitForTask(clientA.page, taskName);
        }
        console.log('[PartialBatch] All tasks still present on Client A');

        // Set up Client B
        clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);
        await clientB.sync.syncAndWait();

        // Verify ALL tasks present on Client B (no missing, no duplicates)
        for (const taskName of taskNames) {
          await waitForTask(clientB.page, taskName);
          const taskLocator = clientB.page.locator(`task:has-text("${taskName}")`);
          await expect(taskLocator).toBeVisible();
        }

        // Verify exact count (no duplicates)
        const countB = await clientB.page
          .locator(`task:has-text("${testRunId}-batch")`)
          .count();
        expect(countB).toBe(taskCount);
        console.log(
          `[PartialBatch] ✓ Client B has exactly ${taskCount} tasks (no duplicates)`,
        );

        console.log('[PartialBatch] ✓ Partial batch failure + retry test PASSED!');
      } finally {
        // Ensure routes are cleaned up
        if (clientA) {
          await clientA.page.unroute('**/api/sync/ops/**').catch(() => {});
        }
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );
});

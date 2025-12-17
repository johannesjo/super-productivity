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
 * SuperSync Late Join E2E Tests
 *
 * Scenarios where a client works locally for a while before enabling sync.
 */

const generateTestRunId = (workerIndex: number): string => {
  return `${Date.now()}-${workerIndex}`;
};

base.describe('@supersync SuperSync Late Join', () => {
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

  base(
    'Late joiner merges correctly with existing server data',
    async ({ browser, baseURL }, testInfo) => {
      const testRunId = generateTestRunId(testInfo.workerIndex);
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // Client A: The "Server" Client (syncs immediately)
        clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        // A creates initial data
        const taskA1 = `A1-${testRunId}`;
        const taskA2 = `A2-${testRunId}`;
        await clientA.workView.addTask(taskA1);
        await clientA.workView.addTask(taskA2);

        // A Syncs
        await clientA.sync.syncAndWait();
        console.log('Client A synced initial tasks');

        // Client B: The "Late Joiner" (works locally first)
        clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
        // DO NOT SETUP SYNC YET

        // B creates local data
        const taskB1 = `B1-${testRunId}`;
        const taskB2 = `B2-${testRunId}`;
        await clientB.workView.addTask(taskB1);
        await clientB.workView.addTask(taskB2);
        console.log('Client B created local tasks');

        // A creates more data (server moves ahead)
        const taskA3 = `A3-${testRunId}`;
        await clientA.workView.addTask(taskA3);
        await clientA.sync.syncAndWait();
        console.log('Client A added more tasks and synced');

        // B creates more local data
        const taskB3 = `B3-${testRunId}`;
        await clientB.workView.addTask(taskB3);
        console.log('Client B added more local tasks');

        // NOW B Enables Sync
        console.log('Client B enabling sync...');
        await clientB.sync.setupSuperSync(syncConfig);

        // Initial sync happens automatically on setup usually, but let's trigger to be sure
        await clientB.sync.syncAndWait();

        // Handle Potential Conflict Dialog
        // Since B has local data and server has remote data, and they might touch global settings or similar,
        // a conflict might occur. However, tasks are distinct IDs, so they should merge cleanly.
        // If a conflict dialog appears for Global Config or similar, we should handle it.
        // Check multiple times as dialog might appear with slight delay
        const conflictDialog = clientB.page.locator('dialog-conflict-resolution');
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await conflictDialog.waitFor({ state: 'visible', timeout: 2000 });
            console.log('Conflict dialog detected on B, resolving...');
            // Pick Remote for singleton models (like Global Config)
            const useRemoteBtn = conflictDialog
              .locator('button')
              .filter({ hasText: 'Remote' })
              .first();
            if (await useRemoteBtn.isVisible()) {
              await useRemoteBtn.click();
              // Wait for dialog to close
              await conflictDialog.waitFor({ state: 'hidden', timeout: 5000 });
            } else {
              // Fallback: dismiss dialog
              await clientB.page.keyboard.press('Escape');
            }
            // Brief wait for any subsequent dialogs
            await clientB.page.waitForTimeout(500);
          } catch {
            // No conflict dialog visible, proceed
            break;
          }
        }

        // Wait for sync to fully settle after conflict resolution
        await clientB.page.waitForTimeout(2000);

        // Trigger another sync to ensure all data is propagated
        await clientB.sync.syncAndWait();

        // A Syncs to get B's data
        await clientA.sync.syncAndWait();

        // Brief wait for state to propagate
        await clientA.page.waitForTimeout(1000);

        // VERIFICATION
        // Both clients should have A1, A2, A3, B1, B2, B3

        const allTasks = [taskA1, taskA2, taskA3, taskB1, taskB2, taskB3];

        console.log('Verifying all tasks on Client A');
        for (const task of allTasks) {
          await waitForTask(clientA.page, task);
          await expect(clientA.page.locator(`task:has-text("${task}")`)).toBeVisible();
        }

        console.log('Verifying all tasks on Client B');
        for (const task of allTasks) {
          await waitForTask(clientB.page, task);
          await expect(clientB.page.locator(`task:has-text("${task}")`)).toBeVisible();
        }
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );
});

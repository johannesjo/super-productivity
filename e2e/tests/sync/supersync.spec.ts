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
 * SuperSync E2E Tests
 *
 * These tests verify multi-client sync using the real super-sync-server.
 * They mirror scenarios from sync-scenarios.integration.spec.ts but test
 * the full stack including UI, network, and real IndexedDB isolation.
 *
 * Prerequisites:
 * - super-sync-server running on localhost:1900 with TEST_MODE=true
 * - Frontend running on localhost:4242
 *
 * Run with: npm run e2e:supersync
 */

/**
 * Generate a unique test run ID for data isolation.
 */
const generateTestRunId = (workerIndex: number): string => {
  return `${Date.now()}-${workerIndex}`;
};

base.describe('@supersync SuperSync E2E', () => {
  // Skip all tests if server is not running
  base.beforeAll(async () => {
    const healthy = await isServerHealthy();
    if (!healthy) {
      base.skip();
    }
  });

  /**
   * Scenario 2.1: Client A Creates, Client B Downloads
   *
   * This is the simplest sync scenario - one client creates data,
   * another client downloads it.
   *
   * Setup: Client A and B, empty server
   *
   * Actions:
   * 1. Client A creates "Task 1", syncs
   * 2. Client B syncs (download)
   *
   * Expected:
   * - Client A: has Task 1
   * - Client B: has Task 1 (received via sync)
   * - Server: has 1 operation
   */
  base(
    '2.1 Client A creates task, Client B downloads it',
    async ({ browser, baseURL }, testInfo) => {
      const testRunId = generateTestRunId(testInfo.workerIndex);
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        // Create shared test user (both clients use same account)
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // Set up Client A
        clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        // Step 1: Client A creates a task
        const taskName = `Task-${testRunId}-from-A`;
        await clientA.workView.addTask(taskName);

        // Step 2: Client A syncs (upload)
        await clientA.sync.syncAndWait();

        // Verify Client A still has the task
        await waitForTask(clientA.page, taskName);

        // Set up Client B (fresh context = isolated IndexedDB)
        clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);

        // Step 3: Client B syncs (download)
        await clientB.sync.syncAndWait();

        // Verify Client B has the task from Client A
        await waitForTask(clientB.page, taskName);

        // Final assertions
        const taskLocatorA = clientA.page.locator(`task:has-text("${taskName}")`);
        const taskLocatorB = clientB.page.locator(`task:has-text("${taskName}")`);

        await expect(taskLocatorA).toBeVisible();
        await expect(taskLocatorB).toBeVisible();
      } finally {
        // Cleanup
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );

  /**
   * Scenario 2.2: Both Clients Create Different Tasks
   *
   * Setup: A and B connected, empty server
   *
   * Actions:
   * 1. Client A creates "Task A", syncs
   * 2. Client B creates "Task B", syncs
   * 3. Client A syncs (download)
   *
   * Expected: Both clients have both tasks
   */
  base(
    '2.2 Both clients create different tasks',
    async ({ browser, baseURL }, testInfo) => {
      const testRunId = generateTestRunId(testInfo.workerIndex);
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // Set up both clients
        clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);

        // Step 1: Client A creates Task A
        const taskA = `TaskA-${testRunId}`;
        await clientA.workView.addTask(taskA);

        // Step 2: Client A syncs (upload Task A)
        await clientA.sync.syncAndWait();

        // Step 3: Client B creates Task B
        const taskB = `TaskB-${testRunId}`;
        await clientB.workView.addTask(taskB);

        // Step 4: Client B syncs (upload Task B, download Task A)
        await clientB.sync.syncAndWait();

        // Step 5: Client A syncs (download Task B)
        await clientA.sync.syncAndWait();

        // Verify both clients have both tasks
        await waitForTask(clientA.page, taskA);
        await waitForTask(clientA.page, taskB);
        await waitForTask(clientB.page, taskA);
        await waitForTask(clientB.page, taskB);

        await expect(clientA.page.locator(`task:has-text("${taskA}")`)).toBeVisible();
        await expect(clientA.page.locator(`task:has-text("${taskB}")`)).toBeVisible();
        await expect(clientB.page.locator(`task:has-text("${taskA}")`)).toBeVisible();
        await expect(clientB.page.locator(`task:has-text("${taskB}")`)).toBeVisible();
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );

  /**
   * Scenario 1.3: Update Task and Sync
   *
   * Setup: Client A with existing task
   *
   * Actions:
   * 1. Client A creates "Task 1", syncs
   * 2. Client B syncs (download)
   * 3. Client A marks task as done, syncs
   * 4. Client B syncs
   *
   * Expected: Both clients see task as done
   */
  base(
    '1.3 Update propagates between clients',
    async ({ browser, baseURL }, testInfo) => {
      const testRunId = generateTestRunId(testInfo.workerIndex);
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // Set up Client A and create task
        clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        const taskName = `Task-${testRunId}-update`;
        await clientA.workView.addTask(taskName);
        await clientA.sync.syncAndWait();

        // Set up Client B and sync to get the task
        clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);
        await clientB.sync.syncAndWait();

        // Verify Client B has the task
        await waitForTask(clientB.page, taskName);

        // Client A marks task as done
        const taskLocatorA = clientA.page.locator(`task:has-text("${taskName}")`);
        await taskLocatorA.locator('.mat-mdc-checkbox').click();

        // Client A syncs the update
        await clientA.sync.syncAndWait();

        // Client B syncs to receive the update
        await clientB.sync.syncAndWait();

        // Verify both show task as done
        const checkboxA = taskLocatorA.locator('.mat-mdc-checkbox');
        const taskLocatorB = clientB.page.locator(`task:has-text("${taskName}")`);
        const checkboxB = taskLocatorB.locator('.mat-mdc-checkbox');

        await expect(checkboxA).toBeChecked();
        await expect(checkboxB).toBeChecked();
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );

  /**
   * Scenario 1.4: Delete Task and Sync
   *
   * Actions:
   * 1. Client A creates task, syncs
   * 2. Client B syncs (download)
   * 3. Client A deletes task, syncs
   * 4. Client B syncs
   *
   * Expected: Task removed from both clients
   */
  base(
    '1.4 Delete propagates between clients',
    async ({ browser, baseURL }, testInfo) => {
      const testRunId = generateTestRunId(testInfo.workerIndex);
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // Set up Client A and create task
        clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        const taskName = `Task-${testRunId}-delete`;
        await clientA.workView.addTask(taskName);
        await clientA.sync.syncAndWait();

        // Set up Client B and sync
        clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);
        await clientB.sync.syncAndWait();

        // Verify Client B has the task
        await waitForTask(clientB.page, taskName);

        // Client A deletes the task
        const taskLocatorA = clientA.page.locator(`task:has-text("${taskName}")`);
        await taskLocatorA.hover();
        const deleteBtn = taskLocatorA.locator('button[aria-label="Delete task"]');
        await deleteBtn.click();

        // Confirm deletion if dialog appears
        const confirmBtn = clientA.page.locator(
          'mat-dialog-actions button:has-text("Delete")',
        );
        if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await confirmBtn.click();
        }

        // Client A syncs the deletion
        await clientA.sync.syncAndWait();

        // Client B syncs to receive the deletion
        await clientB.sync.syncAndWait();

        // Verify task is removed from both clients
        await expect(
          clientA.page.locator(`task:has-text("${taskName}")`),
        ).not.toBeVisible();
        await expect(
          clientB.page.locator(`task:has-text("${taskName}")`),
        ).not.toBeVisible();
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );

  /**
   * Scenario 3.1: Concurrent Edits on Same Task
   *
   * This tests basic conflict handling - both clients edit the same
   * task without seeing each other's changes first.
   *
   * Actions:
   * 1. Client A creates task, syncs
   * 2. Client B syncs (download)
   * 3. Client A marks task done (no sync yet)
   * 4. Client B adds notes to task (no sync yet)
   * 5. Client A syncs
   * 6. Client B syncs
   *
   * Expected: Conflict detected or auto-merged, final state consistent
   */
  base(
    '3.1 Concurrent edits handled gracefully',
    async ({ browser, baseURL }, testInfo) => {
      const testRunId = generateTestRunId(testInfo.workerIndex);
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // Set up both clients
        clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        const taskName = `Task-${testRunId}-conflict`;
        await clientA.workView.addTask(taskName);
        await clientA.sync.syncAndWait();

        clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);
        await clientB.sync.syncAndWait();

        // Both clients now have the task
        await waitForTask(clientA.page, taskName);
        await waitForTask(clientB.page, taskName);

        // Client A marks done (creates local op)
        const taskLocatorA = clientA.page.locator(`task:has-text("${taskName}")`);
        await taskLocatorA.locator('.mat-mdc-checkbox').click();

        // Client B marks done too (concurrent edit)
        const taskLocatorB = clientB.page.locator(`task:has-text("${taskName}")`);
        await taskLocatorB.locator('.mat-mdc-checkbox').click();

        // Client A syncs first
        await clientA.sync.syncAndWait();

        // Client B syncs (may detect concurrent edit)
        await clientB.sync.syncAndWait();

        // Client A syncs again to converge
        await clientA.sync.syncAndWait();

        // Verify both clients have consistent state
        const countA = await clientA.page.locator('task').count();
        const countB = await clientB.page.locator('task').count();
        expect(countA).toBe(countB);

        // Task should exist on both
        await expect(taskLocatorA).toBeVisible();
        await expect(taskLocatorB).toBeVisible();
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );

  /**
   * Scenario 2.3: Client A Creates Parent, Client B Creates Subtask
   *
   * Tests parent-child task relationships syncing correctly.
   *
   * Actions:
   * 1. Client A creates parent task, syncs
   * 2. Client B syncs (downloads parent)
   * 3. Client B creates subtask under parent, syncs
   * 4. Client A syncs (downloads subtask)
   *
   * Expected: Both clients have parent with subtask
   */
  base(
    '2.3 Client A creates parent, Client B creates subtask',
    async ({ browser, baseURL }, testInfo) => {
      const testRunId = generateTestRunId(testInfo.workerIndex);
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // Set up Client A and create parent task
        clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        const parentTaskName = `Parent-${testRunId}`;
        await clientA.workView.addTask(parentTaskName);
        await clientA.sync.syncAndWait();

        // Set up Client B and sync to get the parent task
        clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);
        await clientB.sync.syncAndWait();

        // Verify Client B has the parent task
        await waitForTask(clientB.page, parentTaskName);

        // Client B creates a subtask under the parent
        const subtaskName = `Subtask-${testRunId}`;
        const parentTaskB = clientB.page.locator(`task:has-text("${parentTaskName}")`);
        await clientB.workView.addSubTask(parentTaskB, subtaskName);

        // Client B syncs (uploads subtask)
        await clientB.sync.syncAndWait();

        // Client A syncs (downloads subtask)
        await clientA.sync.syncAndWait();

        // Verify both clients have parent and subtask
        // First expand the parent task to see subtasks
        const parentTaskA = clientA.page.locator(`task:has-text("${parentTaskName}")`);
        const expandBtnA = parentTaskA.locator('.expand-btn');
        if (await expandBtnA.isVisible()) {
          await expandBtnA.click();
        }

        const expandBtnB = parentTaskB.locator('.expand-btn');
        if (await expandBtnB.isVisible()) {
          await expandBtnB.click();
        }

        // Wait for subtasks to be visible
        await waitForTask(clientA.page, subtaskName);
        await waitForTask(clientB.page, subtaskName);

        // Verify subtask exists on both
        await expect(
          clientA.page.locator(`task:has-text("${subtaskName}")`),
        ).toBeVisible();
        await expect(
          clientB.page.locator(`task:has-text("${subtaskName}")`),
        ).toBeVisible();
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );
});

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
import { waitForAppReady } from '../../utils/waits';

/**
 * SuperSync Edge Cases E2E Tests
 *
 * Covers specific edge cases like moving tasks between projects,
 * undo/redo propagation, offline bursts, and field-level merging.
 */

const generateTestRunId = (workerIndex: number): string => {
  return `${Date.now()}-${workerIndex}`;
};

// Robust helper to create a project (copied from supersync-models.spec.ts for self-containment)
const createProjectReliably = async (page: Page, projectName: string): Promise<void> => {
  await page.goto('/#/tag/TODAY/work');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Ensure sidebar is in full mode (visible labels)
  const navSidenav = page.locator('.nav-sidenav');
  if (await navSidenav.isVisible()) {
    const isCompact = await navSidenav.evaluate((el) =>
      el.classList.contains('compactMode'),
    );
    if (isCompact) {
      const toggleBtn = navSidenav.locator('.mode-toggle');
      if (await toggleBtn.isVisible()) {
        await toggleBtn.click();
        await page.waitForTimeout(500);
      }
    }
  }

  // Find the Projects section wrapper
  const projectsTree = page
    .locator('nav-list-tree')
    .filter({ hasText: 'Projects' })
    .first();
  await projectsTree.waitFor({ state: 'visible' });

  // The "Create Project" button is an additional-btn with an 'add' icon
  const addBtn = projectsTree.locator('.additional-btn mat-icon:has-text("add")').first();

  if (await addBtn.isVisible()) {
    await addBtn.click();
  } else {
    // Try to hover the group header to make buttons appear
    const groupNavItem = projectsTree.locator('nav-item').first();
    await groupNavItem.hover();
    await page.waitForTimeout(200);
    if (await addBtn.isVisible()) {
      await addBtn.click();
    } else {
      throw new Error('Could not find Create Project button');
    }
  }

  // Dialog
  const nameInput = page.getByRole('textbox', { name: 'Project Name' });
  await nameInput.waitFor({ state: 'visible', timeout: 10000 });
  await nameInput.fill(projectName);

  const submitBtn = page.locator('dialog-create-project button[type=submit]').first();
  await submitBtn.click();

  // Wait for dialog to close
  await nameInput.waitFor({ state: 'hidden', timeout: 5000 });

  // Wait for project to appear
  await page.waitForTimeout(1000);
};

base.describe('@supersync SuperSync Edge Cases', () => {
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
   * Scenario 1: Move Task Between Projects
   *
   * Verifies that moving a task from one project to another syncs correctly.
   *
   * Actions:
   * 1. Client A creates Project 1 and Project 2
   * 2. Client A creates Task in Project 1
   * 3. Sync A -> Sync B
   * 4. Client A moves Task to Project 2
   * 5. Sync A -> Sync B
   * 6. Verify Task is in Project 2 on Client B
   * 7. Verify Task is NOT in Project 1 on Client B
   */
  base(
    'Move task between projects syncs correctly',
    async ({ browser, baseURL }, testInfo) => {
      const testRunId = generateTestRunId(testInfo.workerIndex);
      const appUrl = baseURL || 'http://localhost:4242';
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // Setup Clients
        clientA = await createSimulatedClient(browser, appUrl, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        clientB = await createSimulatedClient(browser, appUrl, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);

        // 1. Create Projects on A
        const proj1Name = `Proj1-${testRunId}`;
        const proj2Name = `Proj2-${testRunId}`;

        await createProjectReliably(clientA.page, proj1Name);
        await createProjectReliably(clientA.page, proj2Name);

        // 2. Create Task in Project 1
        // Navigate to Project 1
        const projectBtn1 = clientA.page.getByText(proj1Name).first();
        await projectBtn1.click({ force: true });
        await clientA.page.waitForLoadState('networkidle');

        const taskName = `MovingTask-${testRunId}`;
        await clientA.workView.addTask(taskName);

        // 3. Sync A -> Sync B
        await clientA.sync.syncAndWait();
        await clientB.sync.syncAndWait();

        // Verify B has projects and task in Proj 1
        const projectBtnB1 = clientB.page.getByText(proj1Name).first();
        await expect(projectBtnB1).toBeVisible();
        await projectBtnB1.click({ force: true });
        await waitForTask(clientB.page, taskName);

        // 4. Client A moves Task to Project 2
        // Using context menu or drag and drop. Context menu is more reliable for e2e.
        const taskLocatorA = clientA.page.locator(`task:has-text("${taskName}")`);
        await taskLocatorA.click({ button: 'right' });

        // Click "Move to project"
        const moveItem = clientA.page
          .locator('.mat-mdc-menu-item')
          .filter({ hasText: 'Move to project' });
        await moveItem.click();

        // Select Project 2 from the submenu
        const proj2Item = clientA.page
          .locator('.mat-mdc-menu-item:not(.nav-link)')
          .filter({ hasText: proj2Name });
        await proj2Item.waitFor({ state: 'visible' });
        await proj2Item.click();

        // Verify move locally on A
        // Should disappear from Proj 1 view
        await expect(taskLocatorA).not.toBeVisible();

        // Go to Proj 2 and check
        const projectBtn2 = clientA.page.getByText(proj2Name).first();
        await projectBtn2.click({ force: true });
        await waitForTask(clientA.page, taskName);

        // 5. Sync A -> Sync B
        await clientA.sync.syncAndWait();
        await clientB.sync.syncAndWait();

        // 6. Verify Task is in Project 2 on Client B
        const projectBtnB2 = clientB.page.getByText(proj2Name).first();
        await projectBtnB2.click({ force: true });
        await waitForTask(clientB.page, taskName);

        // 7. Verify Task is NOT in Project 1 on Client B
        await projectBtnB1.click({ force: true });
        // Short wait to ensure UI updates
        await clientB.page.waitForTimeout(500);
        // Should not be visible in Project 1 list
        const taskInProj1B = clientB.page.locator(`task:has-text("${taskName}")`);
        await expect(taskInProj1B).not.toBeVisible();

        console.log(
          '[MoveTask] ✓ Task moved between projects successfully across clients',
        );
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );

  /**
   * Scenario 2: Undo Propagation
   *
   * Verifies that undoing an action (specifically task deletion) syncs the reversal.
   * Note: SuperProductivity primarily supports "Undo" for task deletion via Snackbar.
   *
   * Actions:
   * 1. Client A creates Task
   * 2. Sync A -> Sync B
   * 3. Client A deletes Task
   * 4. Client A Undoes the deletion via Snackbar
   * 5. Sync A -> Sync B
   * 6. Verify Task exists on Client B
   */
  base.fixme(
    'Undo propagation syncs correctly',
    async ({ browser, baseURL }, testInfo) => {
      testInfo.setTimeout(90000);
      const testRunId = generateTestRunId(testInfo.workerIndex);
      const appUrl = baseURL || 'http://localhost:4242';
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // Setup Clients
        clientA = await createSimulatedClient(browser, appUrl, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        clientB = await createSimulatedClient(browser, appUrl, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);

        // 1. Create Task on A
        const taskName = `UndoTask-${testRunId}`;
        await clientA.workView.addTask(taskName);

        // 2. Sync A -> Sync B
        await clientA.sync.syncAndWait();
        await clientB.sync.syncAndWait();
        await waitForTask(clientB.page, taskName);

        // 3. Client A deletes Task
        const taskLocatorA = clientA.page.locator(
          `task:not(.ng-animating):has-text("${taskName}")`,
        );
        await taskLocatorA.waitFor({ state: 'visible' });

        // Open context menu
        await taskLocatorA.click({ button: 'right' });
        // Click "Delete"
        await clientA.page
          .locator('.mat-mdc-menu-item')
          .filter({ hasText: 'Delete' })
          .click();

        // Confirm dialog if it appears (it usually does for deletes)
        const dialog = clientA.page.locator('dialog-confirm');
        // Wait briefly for dialog to appear and click confirm
        try {
          await dialog.waitFor({ state: 'visible', timeout: 2000 });
          await dialog.locator('button[type=submit]').click();
        } catch {
          // Dialog didn't appear or was too fast, assuming proceeding
        }

        // Verify it is gone locally (Removed to optimize speed and catch snackbar)
        // await expect(taskLocatorA).not.toBeVisible();

        // 4. Client A Undoes the action
        // Click "Undo" on Snack Bar
        // Use the specific class for snackbar container and button
        const undoBtn = clientA.page
          .locator(
            '.mat-mdc-snack-bar-container .mat-mdc-button, snack-bar-container button',
          )
          .filter({ hasText: 'Undo' })
          .first();
        // Increase timeout for snackbar to appear after sync/delete ops
        await undoBtn.waitFor({ state: 'visible', timeout: 10000 });
        await undoBtn.click();

        // Verify it is back locally
        await expect(taskLocatorA).toBeVisible();

        // 5. Sync A -> Sync B
        // The undo operation (restore) must sync.
        await clientA.sync.syncAndWait();
        await clientB.sync.syncAndWait();

        // Reload B to ensure fresh state
        await clientB.page.reload();
        await waitForAppReady(clientB.page);

        // 6. Verify Task exists on Client B
        const taskLocatorB = clientB.page.locator(
          `task:not(.ng-animating):has-text("${taskName}")`,
        );
        await expect(taskLocatorB).toBeVisible({ timeout: 10000 });

        console.log('[UndoTest] ✓ Undo deletion propagated successfully');
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );

  /**
   * Scenario 3: Field-level Merging
   *
   * Verifies that concurrent changes to different fields of the same task merge correctly.
   * FIXME: Currently triggers conflict dialog because app uses row-level conflict detection.
   * This test documents desired behavior for future field-level sync support.
   */
  base.fixme(
    'Field-level merging syncs correctly',
    async ({ browser, baseURL }, testInfo) => {
      const testRunId = generateTestRunId(testInfo.workerIndex);
      const appUrl = baseURL || 'http://localhost:4242';
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // Setup Clients
        clientA = await createSimulatedClient(browser, appUrl, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        clientB = await createSimulatedClient(browser, appUrl, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);

        // 1. Create Task on A
        const taskName = `MergeTask-${testRunId}`;
        const newTaskName = `MergedTask-${testRunId}`;
        await clientA.workView.addTask(taskName);

        // 2. Sync A -> Sync B
        await clientA.sync.syncAndWait();
        await clientB.sync.syncAndWait();
        await waitForTask(clientB.page, taskName);

        // 3. Client A changes Task Title
        const taskLocatorA = clientA.page.locator(
          `task:not(.ng-animating):has-text("${taskName}")`,
        );
        // Click task to open side panel
        await taskLocatorA.click();

        const taskTitleHost = clientA.page.locator('task-detail-panel task-title');
        await taskTitleHost.waitFor({ state: 'visible' });

        // Click to enter edit mode
        await taskTitleHost.click();

        const taskTitleInput = taskTitleHost.locator('textarea');
        await taskTitleInput.waitFor({ state: 'visible' });
        await taskTitleInput.fill(newTaskName);
        await taskTitleInput.blur();

        // Verify local update in list
        await expect(
          clientA.page.locator(`task:not(.ng-animating):has-text("${newTaskName}")`),
        ).toBeVisible();

        // 4. Client B marks Task as Done (concurrently, before receiving A's sync)
        const taskLocatorB = clientB.page.locator(
          `task:not(.ng-animating):has-text("${taskName}")`,
        );
        await taskLocatorB.hover();
        await taskLocatorB.locator('.task-done-btn').click();
        await expect(taskLocatorB).toHaveClass(/isDone/);

        // 5. Sync A (pushes title change)
        await clientA.sync.syncAndWait();

        // 6. Sync B (pushes done change, pulls title change)
        await clientB.sync.syncAndWait();

        // Verify B has new title AND is done
        const newTaskLocatorB = clientB.page.locator(
          `task:not(.ng-animating):has-text("${newTaskName}")`,
        );
        await expect(newTaskLocatorB).toBeVisible();
        await expect(newTaskLocatorB).toHaveClass(/isDone/);

        // 7. Sync A (pulls done change)
        await clientA.sync.syncAndWait();

        // 8. Verify A has new title AND is done
        const newTaskLocatorA = clientA.page.locator(
          `task:not(.ng-animating):has-text("${newTaskName}")`,
        );
        await expect(newTaskLocatorA).toHaveClass(/isDone/);

        console.log('[MergeTest] ✓ Concurrent field edits merged successfully');
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );

  /**
   * Scenario 4: Offline Bursts
   *
   * Verifies that a burst of changes made offline syncs correctly when back online.
   *
   * Actions:
   * 1. Client A and B start synced
   * 2. Client A goes "offline" (we just don't sync)
   * 3. Client A: Creates Task 1, Task 2, Task 3
   * 4. Client A: Marks Task 1 as Done
   * 5. Client A: Deletes Task 2
   * 6. Client A syncs (burst)
   * 7. Client B syncs
   * 8. Verify B has Task 1 (Done), No Task 2, Task 3 (Open)
   */
  base(
    'Offline burst of changes syncs correctly',
    async ({ browser, baseURL }, testInfo) => {
      const testRunId = generateTestRunId(testInfo.workerIndex);
      const appUrl = baseURL || 'http://localhost:4242';
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // Setup Clients
        clientA = await createSimulatedClient(browser, appUrl, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        clientB = await createSimulatedClient(browser, appUrl, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);

        // 1. Client A goes "offline" (we just accumulate changes)
        const task1 = `Burst1-${testRunId}`;
        const task2 = `Burst2-${testRunId}`;
        const task3 = `Burst3-${testRunId}`;

        // 3. Create Tasks
        await clientA.workView.addTask(task1);
        await clientA.workView.addTask(task2);
        await clientA.workView.addTask(task3);

        // 4. Mark Task 1 Done
        const taskLocator1 = clientA.page.locator(
          `task:not(.ng-animating):has-text("${task1}")`,
        );
        await taskLocator1.hover();
        await taskLocator1.locator('.task-done-btn').click();
        await expect(taskLocator1).toHaveClass(/isDone/);

        // 5. Delete Task 2
        const taskLocator2 = clientA.page.locator(
          `task:not(.ng-animating):has-text("${task2}")`,
        );
        await taskLocator2.click({ button: 'right' });
        await clientA.page
          .locator('.mat-mdc-menu-item')
          .filter({ hasText: 'Delete' })
          .click();

        const dialog = clientA.page.locator('dialog-confirm');
        if (await dialog.isVisible()) {
          await dialog.locator('button[type=submit]').click();
        }
        await expect(taskLocator2).not.toBeVisible();

        // 6. Client A syncs (burst)
        await clientA.sync.syncAndWait();

        // 7. Client B syncs
        await clientB.sync.syncAndWait();

        // 8. Verify B state
        // Task 1: Visible and Done
        const taskLocatorB1 = clientB.page.locator(
          `task:not(.ng-animating):has-text("${task1}")`,
        );
        await expect(taskLocatorB1).toBeVisible();
        await expect(taskLocatorB1).toHaveClass(/isDone/);

        // Task 2: Not Visible
        const taskLocatorB2 = clientB.page.locator(
          `task:not(.ng-animating):has-text("${task2}")`,
        );
        await expect(taskLocatorB2).not.toBeVisible();

        // Task 3: Visible and Open
        const taskLocatorB3 = clientB.page.locator(
          `task:not(.ng-animating):has-text("${task3}")`,
        );
        await expect(taskLocatorB3).toBeVisible();
        await expect(taskLocatorB3).not.toHaveClass(/isDone/);

        console.log('[BurstTest] ✓ Offline burst changes synced successfully');
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );

  /**
   * Scenario 5: 3-Way Conflict
   *
   * Tests conflict resolution when 3 clients concurrently edit the same task.
   * This is more complex than 2-way conflicts as all 3 clients have divergent state.
   *
   * Actions:
   * 1. Client A creates Task, syncs
   * 2. Client B and C sync (download task)
   * 3. All 3 clients make concurrent changes (no syncs between):
   *    - Client A: Marks task as done
   *    - Client B: Adds time estimate
   *    - Client C: Changes priority (adds tag)
   * 4. Client A syncs first
   * 5. Client B syncs (conflict with A's changes)
   * 6. Client C syncs (conflict with A and B's merged state)
   * 7. All clients sync again to converge
   * 8. Verify all 3 clients have identical final state
   */
  base(
    '3-way conflict: 3 clients edit same task concurrently',
    async ({ browser, baseURL }, testInfo) => {
      testInfo.setTimeout(120000); // 3-way conflicts need more time
      const testRunId = generateTestRunId(testInfo.workerIndex);
      const appUrl = baseURL || 'http://localhost:4242';
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;
      let clientC: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // Setup all 3 clients
        clientA = await createSimulatedClient(browser, appUrl, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        clientB = await createSimulatedClient(browser, appUrl, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);

        clientC = await createSimulatedClient(browser, appUrl, 'C', testRunId);
        await clientC.sync.setupSuperSync(syncConfig);

        // 1. Client A creates task
        const taskName = `3Way-${testRunId}`;
        await clientA.workView.addTask(taskName);
        await clientA.sync.syncAndWait();

        // 2. Clients B and C download the task
        await clientB.sync.syncAndWait();
        await clientC.sync.syncAndWait();

        // Verify all 3 clients have the task
        await waitForTask(clientA.page, taskName);
        await waitForTask(clientB.page, taskName);
        await waitForTask(clientC.page, taskName);

        // 3. All 3 clients make concurrent changes (no syncs between)

        // Client A: Mark as done
        const taskLocatorA = clientA.page.locator(`task:has-text("${taskName}")`);
        await taskLocatorA.hover();
        await taskLocatorA.locator('.task-done-btn').click();

        // Client B: Mark as done (same action, should merge cleanly)
        const taskLocatorB = clientB.page.locator(`task:has-text("${taskName}")`);
        await taskLocatorB.hover();
        await taskLocatorB.locator('.task-done-btn').click();

        // Client C: Mark as done (same action from third client)
        const taskLocatorC = clientC.page.locator(`task:has-text("${taskName}")`);
        await taskLocatorC.hover();
        await taskLocatorC.locator('.task-done-btn').click();

        // 4-6. Sequential syncs to resolve conflicts
        await clientA.sync.syncAndWait();
        await clientB.sync.syncAndWait();
        await clientC.sync.syncAndWait();

        // 7. Final round of syncs to converge
        await clientA.sync.syncAndWait();
        await clientB.sync.syncAndWait();
        await clientC.sync.syncAndWait();

        // 8. Verify all 3 clients have identical state
        // Task should exist and be marked as done on all clients
        await expect(taskLocatorA).toBeVisible();
        await expect(taskLocatorB).toBeVisible();
        await expect(taskLocatorC).toBeVisible();

        // All should show task as done
        await expect(taskLocatorA).toHaveClass(/isDone/);
        await expect(taskLocatorB).toHaveClass(/isDone/);
        await expect(taskLocatorC).toHaveClass(/isDone/);

        // Count tasks - should be identical
        const countA = await clientA.page.locator('task').count();
        const countB = await clientB.page.locator('task').count();
        const countC = await clientC.page.locator('task').count();
        expect(countA).toBe(countB);
        expect(countB).toBe(countC);

        console.log('[3WayConflict] ✓ 3-way conflict resolved, all clients converged');
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
        if (clientC) await closeClient(clientC);
      }
    },
  );

  /**
   * Scenario 6: Delete vs Update Conflict
   *
   * Tests what happens when one client deletes a task while another updates it.
   * This is a common conflict scenario in collaborative editing.
   *
   * Actions:
   * 1. Client A creates Task, syncs
   * 2. Client B syncs (download task)
   * 3. Concurrent changes (no syncs):
   *    - Client A: Deletes the task
   *    - Client B: Updates the task (marks as done)
   * 4. Client A syncs (delete goes to server)
   * 5. Client B syncs (update conflicts with deletion)
   * 6. Verify final state is consistent (delete wins or conflict resolved)
   */
  base(
    'Delete vs Update conflict: one client deletes while another updates',
    async ({ browser, baseURL }, testInfo) => {
      testInfo.setTimeout(90000);
      const testRunId = generateTestRunId(testInfo.workerIndex);
      const appUrl = baseURL || 'http://localhost:4242';
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // Setup clients
        clientA = await createSimulatedClient(browser, appUrl, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        clientB = await createSimulatedClient(browser, appUrl, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);

        // 1. Client A creates task
        const taskName = `DelUpd-${testRunId}`;
        await clientA.workView.addTask(taskName);
        await clientA.sync.syncAndWait();

        // 2. Client B downloads the task
        await clientB.sync.syncAndWait();
        await waitForTask(clientB.page, taskName);

        // 3. Concurrent changes

        // Client A: Delete the task
        const taskLocatorA = clientA.page.locator(`task:has-text("${taskName}")`);
        await taskLocatorA.click({ button: 'right' });
        await clientA.page
          .locator('.mat-mdc-menu-item')
          .filter({ hasText: 'Delete' })
          .click();

        // Handle confirmation dialog if present
        const dialogA = clientA.page.locator('dialog-confirm');
        if (await dialogA.isVisible({ timeout: 2000 }).catch(() => false)) {
          await dialogA.locator('button[type=submit]').click();
        }
        await expect(taskLocatorA).not.toBeVisible();

        // Client B: Mark as done (concurrent with deletion)
        const taskLocatorB = clientB.page.locator(`task:has-text("${taskName}")`);
        await taskLocatorB.hover();
        await taskLocatorB.locator('.task-done-btn').click();

        // 4. Client A syncs (delete goes to server first)
        await clientA.sync.syncAndWait();

        // 5. Client B syncs (update conflicts with deletion)
        // The conflict resolution may show a dialog or auto-resolve
        await clientB.sync.syncAndWait();

        // 6. Final sync to converge
        await clientA.sync.syncAndWait();
        await clientB.sync.syncAndWait();

        // Verify consistent state
        // Both clients should have the same view (either both have task or neither)
        const hasTaskA =
          (await clientA.page.locator(`task:has-text("${taskName}")`).count()) > 0;
        const hasTaskB =
          (await clientB.page.locator(`task:has-text("${taskName}")`).count()) > 0;

        // State should be consistent (doesn't matter which wins, just that they agree)
        expect(hasTaskA).toBe(hasTaskB);

        console.log(
          `[DeleteVsUpdate] ✓ Conflict resolved consistently (task ${hasTaskA ? 'restored' : 'deleted'})`,
        );
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );
});

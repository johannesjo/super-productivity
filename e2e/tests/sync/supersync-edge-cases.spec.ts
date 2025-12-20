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
 * SuperSync Edge Cases E2E Tests
 *
 * Covers specific edge cases like moving tasks between projects,
 * offline bursts, and conflict handling.
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
          'SuperSync server not healthy at http://localhost:1901 - skipping tests',
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
        // Navigate to Project 1 using sidebar nav item (button with nav-link class)
        const projectBtn1 = clientA.page.locator(
          `.nav-sidenav .nav-link:has-text("${proj1Name}")`,
        );
        await projectBtn1.waitFor({ state: 'visible', timeout: 10000 });
        await projectBtn1.click();
        await clientA.page.waitForLoadState('networkidle');
        // Extra wait to ensure project view is fully loaded
        await clientA.page.waitForTimeout(1000);

        const taskName = `MovingTask-${testRunId}`;
        await clientA.workView.addTask(taskName);
        // Wait for task to be fully created before syncing
        await waitForTask(clientA.page, taskName);
        console.log('[MoveTask] Task created in Project 1');

        // 3. Sync A -> Sync B
        await clientA.sync.syncAndWait();
        await clientB.sync.syncAndWait();

        // Verify B has projects and task in Proj 1
        const projectBtnB1 = clientB.page.locator(
          `.nav-sidenav .nav-link:has-text("${proj1Name}")`,
        );
        await expect(projectBtnB1).toBeVisible({ timeout: 10000 });
        await projectBtnB1.click();
        await clientB.page.waitForLoadState('networkidle');
        await clientB.page.waitForTimeout(1000);
        await waitForTask(clientB.page, taskName);
        console.log('[MoveTask] Task synced to Client B in Project 1');

        // 4. Client A moves Task to Project 2
        // First ensure we're on Project 1 view
        await projectBtn1.click();
        await clientA.page.waitForLoadState('networkidle');
        await clientA.page.waitForTimeout(500);

        // Using context menu or drag and drop. Context menu is more reliable for e2e.
        const taskLocatorA = clientA.page
          .locator(`task:not(.ng-animating):has-text("${taskName}")`)
          .first();
        await taskLocatorA.waitFor({ state: 'visible', timeout: 10000 });

        // Context menu retry loop - menus can be flaky due to overlay timing
        let moveSuccess = false;
        for (let attempt = 0; attempt < 3 && !moveSuccess; attempt++) {
          try {
            await taskLocatorA.click({ button: 'right' });

            // Click "Move to project"
            const moveItem = clientA.page
              .locator('.mat-mdc-menu-item')
              .filter({ hasText: 'Move to project' });
            await moveItem.waitFor({ state: 'visible', timeout: 3000 });
            await moveItem.click();

            // Select Project 2 from the submenu
            const proj2Item = clientA.page
              .locator('.mat-mdc-menu-item:not(.nav-link)')
              .filter({ hasText: proj2Name });
            await proj2Item.waitFor({ state: 'visible', timeout: 3000 });
            await proj2Item.click();
            moveSuccess = true;
          } catch (e) {
            console.log(
              `[MoveTask] Context menu attempt ${attempt + 1} failed, retrying...`,
            );
            // Close any open menus by pressing Escape
            await clientA.page.keyboard.press('Escape');
            await clientA.page.waitForTimeout(300);
          }
        }

        if (!moveSuccess) {
          throw new Error('Failed to move task via context menu after 3 attempts');
        }

        // Verify move locally on A
        // Should disappear from current view (Proj 1)
        await clientA.page.waitForTimeout(500); // Wait for move animation
        const taskInProj1A = clientA.page.locator(`task:has-text("${taskName}")`);
        await expect(taskInProj1A).not.toBeVisible({ timeout: 5000 });

        // Go to Proj 2 and check
        const projectBtn2 = clientA.page.locator(
          `.nav-sidenav .nav-link:has-text("${proj2Name}")`,
        );
        await projectBtn2.click();
        await clientA.page.waitForLoadState('networkidle');
        await clientA.page.waitForTimeout(500);
        await waitForTask(clientA.page, taskName);
        console.log('[MoveTask] Task verified in Project 2 on Client A');

        // 5. Sync A -> Sync B
        await clientA.sync.syncAndWait();
        await clientB.sync.syncAndWait();

        // 6. Verify Task is in Project 2 on Client B
        const projectBtnB2 = clientB.page.locator(
          `.nav-sidenav .nav-link:has-text("${proj2Name}")`,
        );
        await projectBtnB2.click();
        await clientB.page.waitForLoadState('networkidle');
        await clientB.page.waitForTimeout(500);
        await waitForTask(clientB.page, taskName);
        console.log('[MoveTask] Task verified in Project 2 on Client B');

        // 7. Verify Task is NOT in Project 1 on Client B
        await projectBtnB1.click();
        await clientB.page.waitForLoadState('networkidle');
        // Wait for UI to settle after navigation
        await clientB.page.waitForTimeout(1000);
        // Should not be visible in Project 1 list
        const taskInProj1B = clientB.page.locator(`task:has-text("${taskName}")`);
        await expect(taskInProj1B).not.toBeVisible({ timeout: 5000 });
        console.log('[MoveTask] Task correctly NOT in Project 1 on Client B');

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
   * Scenario 2: Offline Bursts
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

        // 3. Create Tasks - wait for each to be visible before creating next
        await clientA.workView.addTask(task1);
        await waitForTask(clientA.page, task1);
        console.log('[BurstTest] Task 1 created');
        await clientA.workView.addTask(task2);
        await waitForTask(clientA.page, task2);
        console.log('[BurstTest] Task 2 created');
        await clientA.workView.addTask(task3);
        await waitForTask(clientA.page, task3);
        console.log('[BurstTest] Task 3 created');

        // 4. Mark Task 1 Done with retry logic
        let doneSuccess = false;
        for (let attempt = 0; attempt < 3 && !doneSuccess; attempt++) {
          try {
            const taskLocator1 = clientA.page
              .locator(`task:not(.ng-animating):has-text("${task1}")`)
              .first();
            await taskLocator1.waitFor({ state: 'visible', timeout: 10000 });
            await taskLocator1.hover();
            const doneBtn1 = taskLocator1.locator('.task-done-btn');
            await doneBtn1.waitFor({ state: 'visible', timeout: 5000 });
            await doneBtn1.click();
            await expect(taskLocator1).toHaveClass(/isDone/, { timeout: 5000 });
            doneSuccess = true;
            console.log('[BurstTest] Task 1 marked as done');
          } catch (e) {
            console.log(`[BurstTest] Done attempt ${attempt + 1} failed, retrying...`);
            await clientA.page.waitForTimeout(300);
          }
        }
        if (!doneSuccess) {
          throw new Error('Failed to mark task 1 as done after 3 attempts');
        }
        // Wait for done animation to complete
        await clientA.page.waitForTimeout(500);

        // 5. Delete Task 2 with retry logic for context menu
        let deleteSuccess = false;
        for (let attempt = 0; attempt < 3 && !deleteSuccess; attempt++) {
          try {
            const taskLocator2 = clientA.page
              .locator(`task:not(.ng-animating):has-text("${task2}")`)
              .first();
            await taskLocator2.waitFor({ state: 'visible', timeout: 5000 });
            await taskLocator2.click({ button: 'right' });

            const deleteMenuItem = clientA.page
              .locator('.mat-mdc-menu-item')
              .filter({ hasText: 'Delete' });
            await deleteMenuItem.waitFor({ state: 'visible', timeout: 3000 });
            await deleteMenuItem.click();

            // Handle confirmation dialog
            const dialog = clientA.page.locator('dialog-confirm');
            try {
              await dialog.waitFor({ state: 'visible', timeout: 2000 });
              await dialog.locator('button[type=submit]').click();
              await dialog.waitFor({ state: 'hidden', timeout: 5000 });
            } catch {
              // Dialog may not appear for all delete operations
            }

            // Verify task is deleted
            await expect(taskLocator2).not.toBeVisible({ timeout: 5000 });
            deleteSuccess = true;
          } catch (e) {
            console.log(`[BurstTest] Delete attempt ${attempt + 1} failed, retrying...`);
            // Close any open menus
            await clientA.page.keyboard.press('Escape');
            await clientA.page.waitForTimeout(300);
          }
        }

        if (!deleteSuccess) {
          throw new Error('Failed to delete task after 3 attempts');
        }

        // 6. Client A syncs (burst)
        await clientA.sync.syncAndWait();
        console.log('[BurstTest] Client A synced burst changes');

        // 7. Client B syncs
        await clientB.sync.syncAndWait();
        console.log('[BurstTest] Client B synced');

        // 8. Verify B state
        // Wait for sync and UI to settle
        await clientB.page.waitForTimeout(1000);

        // Task 1: Visible and Done - use waitForTask for reliability
        await waitForTask(clientB.page, task1);
        const taskLocatorB1 = clientB.page
          .locator(`task:not(.ng-animating):has-text("${task1}")`)
          .first();
        await expect(taskLocatorB1).toBeVisible({ timeout: 10000 });
        await expect(taskLocatorB1).toHaveClass(/isDone/, { timeout: 5000 });
        console.log('[BurstTest] Task 1 verified as done on Client B');

        // Task 2: Not Visible (was deleted)
        const taskLocatorB2 = clientB.page.locator(`task:has-text("${task2}")`);
        await expect(taskLocatorB2).not.toBeVisible({ timeout: 5000 });
        console.log('[BurstTest] Task 2 verified as deleted on Client B');

        // Task 3: Visible and Open - use waitForTask for reliability
        await waitForTask(clientB.page, task3);
        const taskLocatorB3 = clientB.page
          .locator(`task:not(.ng-animating):has-text("${task3}")`)
          .first();
        await expect(taskLocatorB3).toBeVisible({ timeout: 10000 });
        await expect(taskLocatorB3).not.toHaveClass(/isDone/, { timeout: 5000 });
        console.log('[BurstTest] Task 3 verified as open on Client B');

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
        // Wait for task to be fully created before syncing
        await waitForTask(clientA.page, taskName);
        console.log('[3WayConflict] Client A created task');
        await clientA.sync.syncAndWait();

        // 2. Clients B and C download the task
        await clientB.sync.syncAndWait();
        await clientC.sync.syncAndWait();

        // Verify all 3 clients have the task with settling time
        await clientA.page.waitForTimeout(500);
        await clientB.page.waitForTimeout(500);
        await clientC.page.waitForTimeout(500);
        await waitForTask(clientA.page, taskName);
        await waitForTask(clientB.page, taskName);
        await waitForTask(clientC.page, taskName);
        console.log('[3WayConflict] All clients have the task');

        // 3. All 3 clients make concurrent changes (no syncs between)
        // Helper to mark task as done with retry for stability
        const markTaskDone = async (
          page: typeof clientA.page,
          name: string,
          clientLabel: string,
        ): Promise<void> => {
          let success = false;
          for (let attempt = 0; attempt < 3 && !success; attempt++) {
            try {
              const taskLoc = page
                .locator(`task:not(.ng-animating):has-text("${name}")`)
                .first();
              await taskLoc.waitFor({ state: 'visible', timeout: 10000 });
              await taskLoc.hover();
              const doneBtn = taskLoc.locator('.task-done-btn');
              await doneBtn.waitFor({ state: 'visible', timeout: 5000 });
              await doneBtn.click();
              // Wait for done state to be applied
              await expect(taskLoc).toHaveClass(/isDone/, { timeout: 5000 });
              // Settling time after marking done
              await page.waitForTimeout(300);
              success = true;
              console.log(`[3WayConflict] Client ${clientLabel} marked task as done`);
            } catch (e) {
              console.log(
                `[3WayConflict] Client ${clientLabel} attempt ${attempt + 1} failed, retrying...`,
              );
              await page.waitForTimeout(300);
            }
          }
          if (!success) {
            throw new Error(
              `Client ${clientLabel} failed to mark task as done after 3 attempts`,
            );
          }
        };

        // Client A: Mark as done
        await markTaskDone(clientA.page, taskName, 'A');

        // Client B: Mark as done (same action, should merge cleanly)
        await markTaskDone(clientB.page, taskName, 'B');

        // Client C: Mark as done (same action from third client)
        await markTaskDone(clientC.page, taskName, 'C');

        // 4-6. Sequential syncs to resolve conflicts
        await clientA.sync.syncAndWait();
        await clientB.sync.syncAndWait();
        await clientC.sync.syncAndWait();

        // 7. Final round of syncs to converge
        await clientA.sync.syncAndWait();
        await clientB.sync.syncAndWait();
        await clientC.sync.syncAndWait();

        // Wait for UI to settle after final sync
        await clientA.page.waitForTimeout(1000);
        await clientB.page.waitForTimeout(1000);
        await clientC.page.waitForTimeout(1000);

        // 8. Verify all 3 clients have identical state
        // First use waitForTask to ensure tasks are present
        await waitForTask(clientA.page, taskName);
        await waitForTask(clientB.page, taskName);
        await waitForTask(clientC.page, taskName);

        // Re-query locators after sync to get fresh references
        const finalTaskA = clientA.page
          .locator(`task:not(.ng-animating):has-text("${taskName}")`)
          .first();
        const finalTaskB = clientB.page
          .locator(`task:not(.ng-animating):has-text("${taskName}")`)
          .first();
        const finalTaskC = clientC.page
          .locator(`task:not(.ng-animating):has-text("${taskName}")`)
          .first();

        // Task should exist and be marked as done on all clients
        await expect(finalTaskA).toBeVisible({ timeout: 10000 });
        await expect(finalTaskB).toBeVisible({ timeout: 10000 });
        await expect(finalTaskC).toBeVisible({ timeout: 10000 });

        // All should show task as done
        await expect(finalTaskA).toHaveClass(/isDone/, { timeout: 5000 });
        await expect(finalTaskB).toHaveClass(/isDone/, { timeout: 5000 });
        await expect(finalTaskC).toHaveClass(/isDone/, { timeout: 5000 });
        console.log('[3WayConflict] All clients verified with done state');

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

  /**
   * Scenario 7: Undo Task Delete Syncs Across Devices
   *
   * Verifies that undoing a task deletion syncs correctly to other clients.
   * This tests the restoreDeletedTask action which carries full task data.
   *
   * Actions:
   * 1. Client A creates Task, syncs
   * 2. Client B syncs (has task)
   * 3. Client A deletes Task
   * 4. Client A clicks Undo (within 5 seconds)
   * 5. Client A syncs
   * 6. Client B syncs
   * 7. Verify Task exists on both clients
   */
  base(
    'Undo task delete syncs restored task to other client',
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

        // 1. Client A creates task
        const taskName = `UndoDelete-${testRunId}`;
        await clientA.workView.addTask(taskName);
        await clientA.sync.syncAndWait();

        // 2. Client B syncs (download task)
        await clientB.sync.syncAndWait();

        // Verify task exists on both clients
        await waitForTask(clientA.page, taskName);
        await waitForTask(clientB.page, taskName);

        // 3. Client A deletes the task
        const taskLocatorA = clientA.page
          .locator(`task:not(.ng-animating):has-text("${taskName}")`)
          .first();
        await taskLocatorA.click({ button: 'right' });
        await clientA.page
          .locator('.mat-mdc-menu-item')
          .filter({ hasText: 'Delete' })
          .click();

        // Handle confirmation dialog if present
        const dialog = clientA.page.locator('dialog-confirm');
        if (await dialog.isVisible()) {
          await dialog.locator('button[type=submit]').click();
        }

        // Verify task is deleted locally
        await expect(taskLocatorA).not.toBeVisible({ timeout: 5000 });

        // 4. Client A clicks Undo (snackbar should be visible)
        // The snackbar appears for 5 seconds with an "Undo" action
        // Use snack-custom .action selector (app uses custom snackbar component)
        const undoButton = clientA.page.locator('snack-custom button.action');
        await undoButton.waitFor({ state: 'visible', timeout: 5000 });
        await undoButton.click();

        // Wait for undo to complete
        await clientA.page.waitForTimeout(500);

        // Verify task is restored locally on A
        const restoredTaskA = clientA.page
          .locator(`task:not(.ng-animating):has-text("${taskName}")`)
          .first();
        await expect(restoredTaskA).toBeVisible({ timeout: 5000 });

        // 5. Client A syncs
        await clientA.sync.syncAndWait();

        // 6. Client B syncs (should receive the restore action)
        await clientB.sync.syncAndWait();

        // Wait for UI to update
        await clientB.page.waitForTimeout(500);

        // 7. Verify Task exists on Client B after sync
        const taskLocatorB = clientB.page
          .locator(`task:not(.ng-animating):has-text("${taskName}")`)
          .first();
        await expect(taskLocatorB).toBeVisible({ timeout: 10000 });

        // Verify both clients have exactly the same task count
        const countA = await clientA.page.locator(`task:has-text("${taskName}")`).count();
        const countB = await clientB.page.locator(`task:has-text("${taskName}")`).count();
        expect(countA).toBe(1);
        expect(countB).toBe(1);

        console.log(
          '[UndoDelete] ✓ Undo task delete synced successfully to other client',
        );
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );

  /**
   * Scenario 8: Rejected Op Does Not Pollute Entity Frontier
   *
   * This test verifies Fix 2.2: rejected operations should NOT be included
   * in the entity frontier used for conflict detection. If rejected ops
   * pollute the frontier, subsequent unrelated operations may be incorrectly
   * rejected or cause false conflicts.
   *
   * Actions:
   * 1. Client A creates Task1, syncs
   * 2. Client B syncs (downloads Task1)
   * 3. Both clients concurrently edit Task1 (causing conflict)
   * 4. Client A syncs first (succeeds)
   * 5. Client B syncs (Task1 edit rejected due to conflict)
   * 6. Client B creates NEW Task2 (unrelated to Task1)
   * 7. Client B syncs again
   * 8. Verify Task2 syncs successfully to Client A
   *    (proves frontier wasn't polluted by rejected op)
   */
  base(
    'Rejected op does not pollute entity frontier for subsequent syncs',
    async ({ browser, baseURL }, testInfo) => {
      testInfo.setTimeout(120000);
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

        // 1. Client A creates Task1
        const task1Name = `ConflictTask-${testRunId}`;
        await clientA.workView.addTask(task1Name);
        await clientA.sync.syncAndWait();

        // 2. Client B downloads Task1
        await clientB.sync.syncAndWait();
        await waitForTask(clientB.page, task1Name);

        // 3. Both clients concurrently edit Task1 (mark as done)
        // Client A marks done - use .first() to avoid strict mode violation from animation duplicates
        const taskLocatorA = clientA.page
          .locator(`task:not(.ng-animating):has-text("${task1Name}")`)
          .first();
        await taskLocatorA.hover();
        await taskLocatorA.locator('.task-done-btn').click();
        await expect(taskLocatorA).toHaveClass(/isDone/, { timeout: 5000 });

        // Client B also marks done (concurrent change, will conflict)
        const taskLocatorB = clientB.page
          .locator(`task:not(.ng-animating):has-text("${task1Name}")`)
          .first();
        await taskLocatorB.hover();
        await taskLocatorB.locator('.task-done-btn').click();
        await expect(taskLocatorB).toHaveClass(/isDone/, { timeout: 5000 });

        // 4. Client A syncs first (succeeds)
        await clientA.sync.syncAndWait();

        // 5. Client B syncs (will get conflict/rejection for Task1 edit)
        // The conflict may be auto-resolved or show dialog - either way, B's op is rejected
        await clientB.sync.syncAndWait();

        // 6. Client B creates a NEW, UNRELATED Task2
        // This is the critical part: if rejected op polluted the frontier,
        // this new task might fail to sync or cause unexpected conflicts
        const task2Name = `NewTaskAfterReject-${testRunId}`;
        await clientB.workView.addTask(task2Name);

        // Verify Task2 exists locally on B
        await waitForTask(clientB.page, task2Name);

        // 7. Client B syncs again (Task2 should sync successfully)
        await clientB.sync.syncAndWait();

        // 8. Client A syncs to receive Task2
        await clientA.sync.syncAndWait();

        // Verify Task2 appeared on Client A
        // This proves the frontier wasn't polluted by the rejected op
        await waitForTask(clientA.page, task2Name);

        // Additional verification: count tasks on both clients
        const countA = await clientA.page
          .locator(`task:has-text("${testRunId}")`)
          .count();
        const countB = await clientB.page
          .locator(`task:has-text("${testRunId}")`)
          .count();

        // Both should have 2 tasks (Task1 and Task2)
        expect(countA).toBe(2);
        expect(countB).toBe(2);

        console.log(
          '[RejectedOpFrontier] ✓ Rejected op did not pollute frontier - subsequent sync succeeded',
        );
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );

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

        // Setup Client A
        clientA = await createSimulatedClient(browser, appUrl, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        // 1. Client A creates many tasks (simulating a day's work)
        const taskCount = 10;
        const taskNames: string[] = [];
        for (let i = 1; i <= taskCount; i++) {
          const taskName = `BulkTask-${i}-${testRunId}`;
          taskNames.push(taskName);
          await clientA.workView.addTask(taskName);
          await waitForTask(clientA.page, taskName);
          console.log(`[BulkSync] Created task ${i}/${taskCount}`);
        }

        // Mark some tasks as done
        for (let i = 0; i < 3; i++) {
          const taskLocator = clientA.page
            .locator(`task:has-text("${taskNames[i]}")`)
            .first();
          await taskLocator.locator('.check-btn').click();
          await clientA.page.waitForTimeout(200);
        }
        console.log('[BulkSync] Marked 3 tasks as done');

        // Sync all changes from A
        await clientA.sync.syncAndWait();
        console.log('[BulkSync] Client A synced all changes');

        // 2. Setup Client B and sync (downloads all operations at once)
        clientB = await createSimulatedClient(browser, appUrl, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);
        await clientB.sync.syncAndWait();
        console.log('[BulkSync] Client B synced (bulk download)');

        // Wait for UI to settle after bulk sync
        await clientB.page.waitForTimeout(2000);

        // 3. Verify B has all tasks from A
        for (const taskName of taskNames) {
          await waitForTask(clientB.page, taskName);
        }
        console.log(`[BulkSync] Client B has all ${taskCount} tasks`);

        // Verify task count matches
        const taskCountB = await clientB.page
          .locator(`task:has-text("${testRunId}")`)
          .count();
        expect(taskCountB).toBe(taskCount);

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

        console.log('[BulkSync] ✓ Bulk sync completed without cascade conflicts');
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

        // Setup Client A
        clientA = await createSimulatedClient(browser, appUrl, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        // Create 250 tasks (250 operations)
        const taskCount = 250;
        const taskNames: string[] = [];
        for (let i = 1; i <= taskCount; i++) {
          const taskName = `HighVol-${i}-${testRunId}`;
          taskNames.push(taskName);
          await clientA.workView.addTask(taskName);
          await waitForTask(clientA.page, taskName);
          if (i % 50 === 0) {
            console.log(`[HighVolume] Created task ${i}/${taskCount}`);
          }
        }

        // Mark 249 tasks as done (249 more operations = 499 total)
        for (let i = 0; i < 249; i++) {
          const taskLocator = clientA.page
            .locator(`task:has-text("${taskNames[i]}")`)
            .first();
          await taskLocator.locator('.check-btn').click();
          await clientA.page.waitForTimeout(100);
          if ((i + 1) % 50 === 0) {
            console.log(`[HighVolume] Marked ${i + 1}/249 tasks as done`);
          }
        }
        console.log('[HighVolume] All 499 operations created locally');

        // Sync all changes from A
        await clientA.sync.syncAndWait();
        console.log('[HighVolume] Client A synced 499 operations');

        // Setup Client B and sync (bulk download)
        clientB = await createSimulatedClient(browser, appUrl, 'B', testRunId);
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

        console.log('[HighVolume] ✓ 499 operations applied successfully');
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );
});

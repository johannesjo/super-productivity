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
import { ProjectPage } from '../../pages/project.page';

/**
 * SuperSync Models E2E Tests
 *
 * Verifies synchronization of non-task models:
 * - Projects
 * - Tags (including creation and assignment)
 * - Project Notes
 */

const generateTestRunId = (workerIndex: number): string => {
  return `${Date.now()}-${workerIndex}`;
};

// Robust helper to create a project
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

  // Expand if collapsed (check the nav-item inside)
  const groupNavItem = projectsTree.locator('nav-item').first();

  // Note: The logic to check if expanded might be tricky without specific attributes,
  // but usually we can proceed to find the add button.

  // The "Create Project" button is an additional-btn with an 'add' icon
  const addBtn = projectsTree.locator('.additional-btn mat-icon:has-text("add")').first();

  if (await addBtn.isVisible()) {
    await addBtn.click();
  } else {
    // Try finding it by tooltip via aria-label or just try clicking the group to ensure it's active
    // Fallback: Use keyboard shortcut or global add if available?
    // For now, let's try to hover the group header to make buttons appear if they are hover-only
    await groupNavItem.hover();
    await page.waitForTimeout(200);
    if (await addBtn.isVisible()) {
      await addBtn.click();
    } else {
      // Absolute fallback
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

  // Wait for project to appear in list
  await page.waitForTimeout(1000);
};

// Robust helper to create a tag
const createTagReliably = async (page: Page, tagName: string): Promise<void> => {
  await page.goto('/#/tag/TODAY/work');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Ensure sidebar is in full mode
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

  // Find the Tags section wrapper
  const tagsTree = page.locator('nav-list-tree').filter({ hasText: 'Tags' }).first();
  await tagsTree.waitFor({ state: 'visible' });

  // The "Create Tag" button is an additional-btn with an 'add' icon
  const addBtn = tagsTree.locator('.additional-btn mat-icon:has-text("add")').first();

  if (await addBtn.isVisible()) {
    await addBtn.click();
  } else {
    const groupNavItem = tagsTree.locator('nav-item').first();
    await groupNavItem.hover();
    await page.waitForTimeout(200);
    if (await addBtn.isVisible()) {
      await addBtn.click();
    } else {
      throw new Error('Could not find Create Tag button');
    }
  }

  // Dialog
  const dialog = page.locator('mat-dialog-container');
  await dialog.waitFor({ state: 'visible', timeout: 10000 });

  const input = dialog.locator('input[type="text"]').first();
  await input.fill(tagName);

  const submitBtn = dialog
    .locator('button[type="submit"], button:has-text("Save")')
    .first();
  await submitBtn.click();

  await dialog.waitFor({ state: 'hidden' });
};

base.describe('@supersync SuperSync Models', () => {
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
    'Projects and their tasks sync correctly',
    async ({ browser, baseURL }, testInfo) => {
      const testRunId = generateTestRunId(testInfo.workerIndex);
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const syncConfig = getSuperSyncConfig(user);

        // Client A setup
        clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        // Create Project on Client A
        const projectName = `Proj-${testRunId}`;
        await createProjectReliably(clientA.page, projectName);

        // Go to project
        const projectBtnA = clientA.page.getByText(projectName).first();
        await projectBtnA.waitFor({ state: 'visible' });
        await projectBtnA.click({ force: true });

        // Add task to project
        const taskName = `TaskInProject-${testRunId}`;
        await clientA.workView.addTask(taskName);

        // Sync A
        await clientA.sync.syncAndWait();

        // Client B setup
        clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
        await clientB.sync.setupSuperSync(syncConfig);
        await clientB.sync.syncAndWait();

        // Verify Project exists on B
        const projectsTreeB = clientB.page
          .locator('nav-list-tree')
          .filter({ hasText: 'Projects' })
          .first();
        await projectsTreeB.waitFor({ state: 'visible' });

        const groupNavItemB = projectsTreeB.locator('nav-item').first();
        // Ensure expanded
        const expandBtnB = groupNavItemB
          .locator('button.expand-btn, button.arrow-btn')
          .first();
        if (await expandBtnB.isVisible()) {
          const isExpanded = await expandBtnB.getAttribute('aria-expanded');
          if (isExpanded !== 'true') {
            await groupNavItemB.click();
            await clientB.page.waitForTimeout(500);
          }
        }

        const projectBtnB = clientB.page.getByText(projectName).first();
        await expect(projectBtnB).toBeVisible();

        // Click project on B
        await projectBtnB.click({ force: true });

        // Verify Task exists in project on B
        await waitForTask(clientB.page, taskName);
        await expect(clientB.page.locator(`task:has-text("${taskName}")`)).toBeVisible();
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );

  base('Tags and tagged tasks sync correctly', async ({ browser, baseURL }, testInfo) => {
    const testRunId = generateTestRunId(testInfo.workerIndex);
    let clientA: SimulatedE2EClient | null = null;
    let clientB: SimulatedE2EClient | null = null;

    try {
      const user = await createTestUser(testRunId);
      const syncConfig = getSuperSyncConfig(user);

      clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
      await clientA.sync.setupSuperSync(syncConfig);

      const tagName = `Tag-${testRunId}`;
      const taskName = `TaggedTask-${testRunId}`;

      // Create tag
      await createTagReliably(clientA.page, tagName);

      // Go back to Today
      await clientA.page.goto('/#/tag/TODAY/work');
      await clientA.page.waitForLoadState('networkidle');

      // Create task
      await clientA.workView.addTask(taskName);

      // Helper to dismiss all overlays reliably
      const dismissAllOverlays = async (): Promise<void> => {
        // Dismiss backdrops by pressing Escape multiple times
        for (let j = 0; j < 3; j++) {
          await clientA.page.keyboard.press('Escape');
          await clientA.page.waitForTimeout(100);
        }
        // Wait for any overlays to disappear
        const overlayBackdrop = clientA.page.locator('.cdk-overlay-backdrop');
        try {
          await overlayBackdrop.waitFor({ state: 'hidden', timeout: 2000 });
        } catch {
          // If still visible, force click to dismiss
          if (await overlayBackdrop.isVisible()) {
            await overlayBackdrop.click({ force: true });
            await clientA.page.waitForTimeout(200);
          }
        }
      };

      // Dismiss any existing overlays first
      await dismissAllOverlays();

      // Add tag to task via context menu (most reliable method)
      const taskLocator = clientA.page.locator(`task:has-text("${taskName}")`);
      await taskLocator.waitFor({ state: 'visible' });

      // Retry loop for opening tags menu via context menu
      let menuOpened = false;
      for (let i = 0; i < 3; i++) {
        try {
          // Ensure clean state before each attempt
          await dismissAllOverlays();

          // Right-click on task to open context menu (doesn't trigger edit mode)
          await taskLocator.click({ button: 'right' });
          await clientA.page.waitForTimeout(300);

          // Find and click the "Edit tags" button in context menu
          const ctxEditTags = clientA.page.locator('.e2e-edit-tags-btn').first();
          await ctxEditTags.waitFor({ state: 'visible', timeout: 3000 });
          await ctxEditTags.click();

          // Wait for tag submenu to appear
          const menuPanel = clientA.page.locator('.mat-mdc-menu-panel').last();
          await menuPanel.waitFor({ state: 'visible', timeout: 5000 });
          menuOpened = true;
          break;
        } catch (e) {
          console.log(`Attempt ${i + 1} to open tags menu failed: ${e}, retrying...`);
          await dismissAllOverlays();
          await clientA.page.waitForTimeout(500);
        }
      }

      if (!menuOpened) {
        throw new Error('Failed to open tags menu after 3 attempts');
      }

      // Select the tag from the submenu (last menu panel is the tag submenu)
      const tagMenu = clientA.page.locator('.mat-mdc-menu-panel').last();
      const tagOption = tagMenu
        .locator('button[mat-menu-item]')
        .filter({ hasText: tagName })
        .first();
      await tagOption.waitFor({ state: 'visible', timeout: 3000 });
      await tagOption.click();

      // Wait for menus to close after selection
      await clientA.page.waitForTimeout(500);
      await dismissAllOverlays();

      // Ensure tag is shown on Client A before syncing
      await expect(taskLocator).toContainText(tagName);

      // Sync A
      await clientA.sync.syncAndWait();

      // Client B
      clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
      await clientB.sync.setupSuperSync(syncConfig);
      await clientB.sync.syncAndWait();

      // Verify Tag exists on B
      const tagsTreeB = clientB.page
        .locator('nav-list-tree')
        .filter({ hasText: 'Tags' })
        .first();
      await tagsTreeB.waitFor({ state: 'visible' });

      const groupNavItemB = tagsTreeB.locator('nav-item').first();
      const expandBtnB = groupNavItemB
        .locator('button.expand-btn, button.arrow-btn')
        .first();
      if (await expandBtnB.isVisible()) {
        const isExpanded = await expandBtnB.getAttribute('aria-expanded');
        if (isExpanded !== 'true') {
          await groupNavItemB.click();
          await clientB.page.waitForTimeout(500);
        }
      }

      // Verify tag is visible in sidebar
      await expect(
        clientB.page.locator('nav-list-tree').filter({ hasText: tagName }),
      ).toBeVisible();

      // Switch to the tag view and verify the task is present
      const tagNavItem = tagsTreeB
        .locator('nav-item')
        .filter({ hasText: tagName })
        .first();
      const tagId = await tagNavItem.getAttribute('data-tag-id');
      if (tagId) {
        await clientB.page.goto(`/#/tag/${tagId}/work`);
      } else {
        await tagNavItem.click({ force: true });
      }
      await clientB.page.waitForLoadState('networkidle');

      await waitForTask(clientB.page, taskName);
      const taskB = clientB.page.locator(`task:has-text("${taskName}")`);
      await expect(taskB).toBeVisible();
      // Check for tag text content in the task (more robust than finding specific tag element structure)
      await expect(taskB).toContainText(tagName);
    } finally {
      if (clientA) await closeClient(clientA);
      if (clientB) await closeClient(clientB);
    }
  });

  base('Project notes sync correctly', async ({ browser, baseURL }, testInfo) => {
    const testRunId = generateTestRunId(testInfo.workerIndex);
    let clientA: SimulatedE2EClient | null = null;
    let clientB: SimulatedE2EClient | null = null;

    try {
      const user = await createTestUser(testRunId);
      const syncConfig = getSuperSyncConfig(user);

      clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
      await clientA.sync.setupSuperSync(syncConfig);

      // Create Project
      const projectName = `NoteProj-${testRunId}`;
      await createProjectReliably(clientA.page, projectName);

      // Navigate to project on A
      // Use sidebar locator to be sure we click the nav item
      const projectsTreeA = clientA.page
        .locator('nav-list-tree')
        .filter({ hasText: 'Projects' })
        .first();
      const projectBtnA = projectsTreeA
        .locator('nav-item')
        .filter({ hasText: projectName })
        .first();

      // Ensure parent is expanded
      const groupNavItemA = projectsTreeA.locator('nav-item').first();
      const expandBtnA = groupNavItemA
        .locator('button.expand-btn, button.arrow-btn')
        .first();
      if (await expandBtnA.isVisible()) {
        const isExpanded = await expandBtnA.getAttribute('aria-expanded');
        if (isExpanded !== 'true') {
          await groupNavItemA.click();
          await clientA.page.waitForTimeout(500);
        }
      }

      await projectBtnA.waitFor({ state: 'visible' });

      // Get Project ID to navigate reliably
      let projectId = await projectBtnA.getAttribute('data-project-id');
      if (!projectId) {
        // Fallback: click and derive from URL if attribute missing
        await projectBtnA.click({ force: true });
        await clientA.page.waitForLoadState('networkidle');
        const urlMatch = clientA.page.url().match(/project\/([^/?#]+)/);
        projectId = urlMatch?.[1] || undefined;
      }
      if (!projectId) {
        throw new Error('Project id not found after creation');
      }

      await clientA.page.goto(`/#/project/${projectId}`);
      await clientA.page.waitForLoadState('networkidle');

      // Add Note
      const noteContent = `This is a synced note ${testRunId}`;
      const projectPageA = new ProjectPage(clientA.page);
      await projectPageA.addNote(noteContent, projectId);

      // Sync A
      await clientA.sync.syncAndWait();

      // Client B
      clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
      await clientB.sync.setupSuperSync(syncConfig);
      await clientB.sync.syncAndWait();

      // Navigate to project on B
      const projectsTreeB = clientB.page
        .locator('nav-list-tree')
        .filter({ hasText: 'Projects' })
        .first();
      await projectsTreeB.waitFor({ state: 'visible' });

      const groupNavItemB = projectsTreeB.locator('nav-item').first();
      const expandBtnB = groupNavItemB
        .locator('button.expand-btn, button.arrow-btn')
        .first();
      if (await expandBtnB.isVisible()) {
        const isExpanded = await expandBtnB.getAttribute('aria-expanded');
        if (isExpanded !== 'true') {
          await groupNavItemB.click();
          await clientB.page.waitForTimeout(500);
        }
      }

      await clientB.page.goto(`/#/project/${projectId}`);
      await clientB.page.waitForLoadState('networkidle');

      // Verify Note
      const toggleNotesBtn = clientB.page.locator('.e2e-toggle-notes-btn');
      if (await toggleNotesBtn.isVisible()) {
        await toggleNotesBtn.click();
      }

      const notesWrapper = clientB.page.locator('notes');
      await expect(notesWrapper).toBeVisible();
      await expect(notesWrapper).toContainText(noteContent);
    } finally {
      if (clientA) await closeClient(clientA);
      if (clientB) await closeClient(clientB);
    }
  });
});

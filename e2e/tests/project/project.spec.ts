import { expect, test } from '../../fixtures/test.fixture';
import { ProjectPage } from '../../pages/project.page';
import { WorkViewPage } from '../../pages/work-view.page';

test.describe('Project', () => {
  let projectPage: ProjectPage;
  let workViewPage: WorkViewPage;

  test.beforeEach(async ({ page, testPrefix }) => {
    projectPage = new ProjectPage(page, testPrefix);
    workViewPage = new WorkViewPage(page, testPrefix);

    // Wait for app to be ready
    await workViewPage.waitForTaskList();
  });

  test('move done tasks to archive without error', async ({ page }) => {
    // First navigate to Inbox project (not Today view) since archive button only shows in project views
    const inboxMenuItem = page.locator('magic-side-nav button:has-text("Inbox")');
    await inboxMenuItem.click();

    // Add tasks using the page object method
    await workViewPage.addTask('Test task 1', true); // skipClose=true to keep input open
    await workViewPage.addTask('Test task 2');

    // Mark first task as done
    const firstTask = page.locator('task').first();
    await firstTask.hover();
    const doneBtn = firstTask.locator('.task-done-btn');
    await doneBtn.waitFor({ state: 'visible' });
    await doneBtn.click();

    // Archive button should be visible in the done tasks section
    const archiveBtn = page.locator('.e2e-move-done-to-archive');
    await archiveBtn.waitFor({ state: 'visible' });
    await archiveBtn.click();

    // Verify one task remains and no error
    const tasks = page.locator('task');
    await expect(tasks).toHaveCount(1);
    await expect(projectPage.globalErrorAlert).not.toBeVisible();
  });

  test.skip('create second project', async ({ page, testPrefix }) => {
    // Handle empty state vs existing projects scenario
    const addProjectBtn = page
      .locator('nav-item')
      .filter({ hasText: 'Create Project' })
      .locator('button');
    const projectsGroupBtn = page
      .locator('nav-list-tree')
      .filter({ hasText: 'Projects' })
      .locator('nav-item button')
      .first();

    // Check if we're in empty state (no projects yet) or if projects group exists
    try {
      await addProjectBtn.waitFor({ state: 'visible', timeout: 1000 });
      // Empty state: project will be created via the empty state button
    } catch {
      // Normal state: expand projects group first
      await projectsGroupBtn.waitFor({ state: 'visible', timeout: 5000 });
      const isExpanded = await projectsGroupBtn.getAttribute('aria-expanded');
      if (isExpanded !== 'true') {
        await projectsGroupBtn.click();
        // Wait for expansion by checking aria-expanded attribute
        await page.waitForFunction(
          (btn) => btn?.getAttribute('aria-expanded') === 'true',
          await projectsGroupBtn.elementHandle(),
          { timeout: 5000 },
        );
      }
    }

    // Create a new project
    await projectPage.createProject('Cool Test Project');

    // Wait for project creation to complete
    await page.waitForLoadState('networkidle');

    // After creating, ensure Projects section exists and is expanded
    await projectsGroupBtn.waitFor({ state: 'visible', timeout: 5000 });

    // Wait for Projects section to be expanded (the project creation should auto-expand it)
    await page
      .waitForFunction(
        () => {
          const btn = document.querySelector(
            'nav-list-tree:has(nav-item button:has-text("Projects")) nav-item button',
          );
          return btn?.getAttribute('aria-expanded') === 'true';
        },
        { timeout: 10000 },
      )
      .catch(async () => {
        // If not expanded, try clicking the main button
        await projectsGroupBtn.click();
      });

    // Find the newly created project directly (with test prefix)
    const expectedProjectName = testPrefix
      ? `${testPrefix}-Cool Test Project`
      : 'Cool Test Project';

    // Check if .nav-children container is visible after expansion attempts
    const navChildren = page.locator('.nav-children');
    const navChildrenExists = await navChildren.count();

    if (navChildrenExists > 0) {
      await navChildren.waitFor({ state: 'visible', timeout: 5000 });
    } else {
      // Projects section might not have expanded properly - continue with fallback approaches
    }

    let newProject;
    let projectFound = false;

    // If .nav-children exists, use structured approach
    if (navChildrenExists > 0) {
      try {
        // Primary approach: nav-child-item structure with nav-item button
        newProject = page
          .locator('.nav-children .nav-child-item nav-item button')
          .filter({ hasText: expectedProjectName });
        await newProject.waitFor({ state: 'visible', timeout: 3000 });
        projectFound = true;
      } catch {
        try {
          // Second approach: any nav-child-item with the project name
          newProject = page
            .locator('.nav-child-item')
            .filter({ hasText: expectedProjectName })
            .locator('button');
          await newProject.waitFor({ state: 'visible', timeout: 3000 });
          projectFound = true;
        } catch {
          // Continue to fallback approaches
        }
      }
    }

    // Fallback approaches if structured approach didn't work
    if (!projectFound) {
      try {
        // Fallback: find any button with project name in the nav area
        newProject = page
          .locator('magic-side-nav button')
          .filter({ hasText: expectedProjectName });
        await newProject.waitFor({ state: 'visible', timeout: 3000 });
        projectFound = true;
      } catch {
        // Ultimate fallback: search entire page for project button
        newProject = page.locator('button').filter({ hasText: expectedProjectName });
        await newProject.waitFor({ state: 'visible', timeout: 3000 });
        projectFound = true;
      }
    }

    // Verify the project is found and visible
    await expect(newProject).toBeVisible({ timeout: 3000 });

    // Click on the new project
    await newProject.click();

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');

    // Verify we're in the new project
    await expect(projectPage.workCtxTitle).toContainText(expectedProjectName, {
      timeout: 10000,
    });
  });

  test('navigate to project settings', async ({ page }) => {
    // Navigate to Inbox project
    const inboxMenuItem = page.locator('magic-side-nav button:has-text("Inbox")');
    await inboxMenuItem.click();

    // Navigate directly to settings via the Settings nav item
    const settingsMenuItem = page
      .locator('magic-side-nav a[href="#/config"]')
      .or(page.locator('magic-side-nav a.tour-settingsMenuBtn'))
      .first();
    await settingsMenuItem.click();

    // Navigate to project settings tab/section if needed
    const projectSettingsTab = page
      .locator('button:has-text("Project"), [role="tab"]:has-text("Project")')
      .first();
    if (await projectSettingsTab.isVisible()) {
      await projectSettingsTab.click();
    }

    // Verify we're on the settings page - look for any settings-related content
    const settingsIndicator = page
      .locator(
        'h1:has-text("Settings"), h2:has-text("Settings"), .settings-section, mat-tab-group',
      )
      .first();
    await expect(settingsIndicator).toBeVisible();
  });
});

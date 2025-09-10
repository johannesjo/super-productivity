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
    // Additional wait for stability in parallel execution
    await page.waitForTimeout(50);
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

  test('create second project', async ({ page, testPrefix }) => {
    // First click on Projects menu item to expand it
    const projectsButton = page.locator('nav-item button:has-text("Projects")');
    await projectsButton.waitFor({ state: 'visible', timeout: 5000 });

    // Check if projects section is already expanded
    const isExpanded = await projectsButton.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
      await projectsButton.click();
      await page.waitForTimeout(500); // Wait for expansion animation
    }

    // Create a new project
    await projectPage.createProject('Cool Test Project');

    // After creating, ensure Projects section is still expanded
    await projectsButton.waitFor({ state: 'visible', timeout: 3000 });
    const isStillExpanded = await projectsButton.getAttribute('aria-expanded');
    if (isStillExpanded !== 'true') {
      await projectsButton.click();
      await page.waitForTimeout(500); // Wait for expansion animation
    }

    // Find the newly created project directly (with test prefix)
    const expectedProjectName = testPrefix
      ? `${testPrefix}-Cool Test Project`
      : 'Cool Test Project';

    // Look for the project in the nav children area
    const newProject = page.locator(`nav-item button:has-text("${expectedProjectName}")`);
    await expect(newProject).toBeVisible({ timeout: 5000 });

    // Click on the new project
    await newProject.click();

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');

    // Verify we're in the new project
    await expect(projectPage.workCtxTitle).toContainText(expectedProjectName);
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

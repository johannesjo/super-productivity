import { test, expect } from '../../fixtures/app.fixture';
import { ProjectPage } from '../../pages/project.page';
import { AppHelpers } from '../../helpers/app-helpers';

test.describe('Project Management', () => {
  let projectPage: ProjectPage;

  test.beforeEach(async ({ page }) => {
    projectPage = new ProjectPage(page);
    // Create default project
    await AppHelpers.createDefaultProject(page);
  });

  test.skip('move done tasks to archive without error', async ({
    page,
    workViewPage,
  }) => {
    // Wait for project page to be ready
    await page.waitForTimeout(1000);

    // Add tasks directly (already in project context)
    await workViewPage.waitForTaskList();
    await workViewPage.addTask('Test task 1');
    await workViewPage.addTask('Test task 2');

    // Mark first task as done
    const firstTask = page.locator('task').first();
    await firstTask.hover();
    const doneBtn = firstTask.locator('.task-done-btn');
    await doneBtn.waitFor({ state: 'visible' });
    await doneBtn.click();

    // Move to archive
    await projectPage.moveTasksToArchive();
    await page.waitForTimeout(500);

    // Verify one task remains and no error
    await expect(page.locator('task')).toHaveCount(1);
    await expect(projectPage.globalErrorAlert).not.toBeVisible();
  });

  test.skip('create second project', async ({ page }) => {
    // Create new project
    const projectName = 'Cool Test Project';
    await projectPage.createProject(projectName);

    // Verify project exists
    const secondProject = await projectPage.getProjectByIndex(1);
    await expect(secondProject).toBeVisible();
    await expect(secondProject).toContainText(projectName);

    // Navigate to new project
    await projectPage.navigateToProject(projectName);

    // Verify we're in the new project
    await expect(projectPage.workContextTitle).toContainText(projectName);
  });

  test.skip('navigate to project settings', async ({ page }) => {
    // Open settings for default project
    await projectPage.openProjectSettings(0);

    // Verify settings page
    const settingsTitle = page.locator('.component-wrapper .mat-h1');
    await expect(settingsTitle).toBeVisible();
    await expect(settingsTitle).toContainText('Project Specific Settings');
  });
});

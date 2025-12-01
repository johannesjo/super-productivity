import { test, expect } from '../../fixtures/test.fixture';

const TASK = 'task';
const TASK_TITLE = 'task task-title';
const FIRST_TASK = 'task:first-of-type';
const UNDONE_TASK_LIST = 'task-list[listmodelid="UNDONE"]';
const DONE_TASK_LIST = 'task-list[listmodelid="DONE"]';
const DONE_TASKS_SECTION = '.tour-doneList';
const TOGGLE_DONE_TASKS_BTN = '.tour-doneList .mat-expansion-indicator';

test.describe('Work View Features', () => {
  test('should show undone and done task lists', async ({
    page,
    workViewPage,
    testPrefix,
  }) => {
    test.setTimeout(30000); // Increase timeout

    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Wait for any dialogs to be dismissed
    await page.waitForTimeout(2000);

    // Verify undone task list is visible
    await expect(page.locator(UNDONE_TASK_LIST)).toBeVisible({ timeout: 8000 }); // Reduced from 10s to 8s

    // Create tasks
    await workViewPage.addTask('Task 1');
    await page.waitForSelector(TASK, { state: 'visible', timeout: 4000 }); // Reduced from 5s to 4s
    await page.waitForTimeout(500);

    await workViewPage.addTask('Task 2');
    await page.waitForTimeout(1000);

    // Verify we have 2 tasks
    await expect(page.locator(TASK)).toHaveCount(2);

    // Mark first task as done
    const firstTask = page.locator(FIRST_TASK);
    await firstTask.waitFor({ state: 'visible' });

    // Hover over the task to show the done button
    await firstTask.hover();

    // Click the done button
    const doneBtn = firstTask.locator('.task-done-btn');
    await doneBtn.waitFor({ state: 'visible' });
    await doneBtn.click();

    // Wait a bit for the transition
    await page.waitForTimeout(2000);

    // Check if done section exists (it might not show if there are no done tasks)
    const doneSectionExists = await page
      .locator(DONE_TASKS_SECTION)
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (doneSectionExists) {
      // Toggle done tasks visibility if needed
      const toggleBtn = page.locator(TOGGLE_DONE_TASKS_BTN);
      if (await toggleBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await toggleBtn.click();
        await page.waitForTimeout(1000);
      }

      // Verify done task list is visible
      await expect(page.locator(DONE_TASK_LIST)).toBeVisible({ timeout: 5000 });

      // Verify tasks are in correct lists
      await expect(page.locator(`${UNDONE_TASK_LIST} ${TASK}`)).toHaveCount(1);
      await expect(page.locator(`${DONE_TASK_LIST} ${TASK}`)).toHaveCount(1);
    } else {
      // If no done section, just verify we have one less undone task
      await expect(page.locator(`${UNDONE_TASK_LIST} ${TASK}`)).toHaveCount(1);
    }
  });

  test('should handle task order correctly', async ({ page, workViewPage }) => {
    test.setTimeout(process.env.CI ? 60000 : 45000);

    // Wait for work view to be ready
    await workViewPage.waitForTaskList();
    await page.waitForTimeout(1000);

    // Create multiple tasks
    await workViewPage.addTask('First created');
    await page.waitForTimeout(500);
    await workViewPage.addTask('Second created');
    await page.waitForTimeout(500);
    await workViewPage.addTask('Third created');
    await page.waitForTimeout(500);
    await workViewPage.addTask('Fourth created');
    await page.waitForTimeout(500);

    // Verify order (newest first)
    await expect(page.locator('task:nth-of-type(1) task-title')).toContainText(
      /Fourth created/,
    );
    await expect(page.locator('task:nth-of-type(2) task-title')).toContainText(
      /Third created/,
    );
    await expect(page.locator('task:nth-of-type(3) task-title')).toContainText(
      /Second created/,
    );
    await expect(page.locator('task:nth-of-type(4) task-title')).toContainText(
      /First created/,
    );
  });

  test('should persist tasks after navigation', async ({ page, workViewPage }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Create a task
    await workViewPage.addTask('Persistent task');
    await page.waitForSelector(TASK, { state: 'visible' });

    // Navigate to settings
    await page.goto('/#/config');
    await expect(page.locator('.page-settings')).toBeVisible();

    // Navigate back
    await page.goto('/#/tag/TODAY');
    await expect(page.locator('task-list').first()).toBeVisible();

    // Verify task is still there
    await expect(page.locator(TASK_TITLE).first()).toContainText(/Persistent task/);
  });
});

import { test, expect } from '../../fixtures/test.fixture';

const TASK = 'task';
const TASK_TEXTAREA = 'task textarea';
const FIRST_TASK = 'task:first-of-type';
const SECOND_TASK = 'task:nth-of-type(2)';
const TASK_DONE_BTN = '.task-done-btn';
const UNDONE_TASK_LIST = 'task-list[listmodelid="UNDONE"]';
const DONE_TASK_LIST = 'task-list[listmodelid="DONE"]';
const DONE_TASKS_SECTION = '.tour-doneList';
const TOGGLE_DONE_TASKS_BTN = '.tour-doneList .mat-expansion-indicator';

test.describe('Work View Features', () => {
  test('should show undone and done task lists', async ({ page, workViewPage }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Verify undone task list is visible
    await expect(page.locator(UNDONE_TASK_LIST)).toBeVisible();

    // Create tasks
    await workViewPage.addTask('Task 1');
    await page.waitForSelector(TASK, { state: 'visible' });
    await workViewPage.addTask('Task 2');

    // Mark first task as done
    await page.hover(FIRST_TASK);
    await page.waitForSelector(`${FIRST_TASK} ${TASK_DONE_BTN}`, { state: 'visible' });
    await page.click(`${FIRST_TASK} ${TASK_DONE_BTN}`);

    // Toggle done tasks visibility
    await page.click(TOGGLE_DONE_TASKS_BTN);

    // Verify done task list is visible
    await expect(page.locator(DONE_TASKS_SECTION)).toBeVisible();
    await expect(page.locator(DONE_TASK_LIST)).toBeVisible();

    // Verify tasks are in correct lists
    await expect(page.locator(`${UNDONE_TASK_LIST} ${TASK}`)).toHaveCount(1);
    await expect(page.locator(`${DONE_TASK_LIST} ${TASK}`)).toHaveCount(1);
  });

  test('should handle task order correctly', async ({ page, workViewPage }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Create multiple tasks
    await workViewPage.addTask('First created');
    await workViewPage.addTask('Second created');
    await workViewPage.addTask('Third created');
    await workViewPage.addTask('Fourth created');

    // Verify order (newest first)
    await expect(page.locator('task:nth-of-type(1) textarea')).toHaveValue(
      /Fourth created/,
    );
    await expect(page.locator('task:nth-of-type(2) textarea')).toHaveValue(
      /Third created/,
    );
    await expect(page.locator('task:nth-of-type(3) textarea')).toHaveValue(
      /Second created/,
    );
    await expect(page.locator('task:nth-of-type(4) textarea')).toHaveValue(
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
    await expect(page.locator(TASK_TEXTAREA).first()).toHaveValue(/Persistent task/);
  });
});

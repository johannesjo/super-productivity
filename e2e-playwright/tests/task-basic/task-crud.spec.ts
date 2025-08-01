import { test, expect } from '../../fixtures/test.fixture';

const TASK = 'task';
const TASK_TEXTAREA = 'task textarea';
const FIRST_TASK = 'task:first-child';
const SECOND_TASK = 'task:nth-child(2)';
const TASK_DONE_BTN = '.task-done-btn';

test.describe('Task CRUD Operations', () => {
  test('should create, edit and delete tasks', async ({ page, workViewPage }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Create first task
    await workViewPage.addTask('First task');
    await page.waitForSelector(TASK, { state: 'visible' });
    await expect(page.locator(TASK_TEXTAREA).first()).toHaveValue(/First task/);

    // Create second task
    await workViewPage.addTask('Second task');
    await expect(page.locator(`${FIRST_TASK} textarea`)).toHaveValue(/Second task/);
    await expect(page.locator(`${SECOND_TASK} textarea`)).toHaveValue(/First task/);

    // Edit first task (newest)
    await page.click(`${FIRST_TASK} textarea`);
    await page.fill(`${FIRST_TASK} textarea`, 'Edited second task');
    await page.keyboard.press('Tab'); // Blur to save
    await expect(page.locator(`${FIRST_TASK} textarea`)).toHaveValue(
      /Edited second task/,
    );

    // Mark first task as done
    await page.hover(FIRST_TASK);
    await page.waitForSelector(`${FIRST_TASK} ${TASK_DONE_BTN}`, { state: 'visible' });
    await page.click(`${FIRST_TASK} ${TASK_DONE_BTN}`);

    // Verify task is marked as done
    await expect(page.locator(`${FIRST_TASK}.isDone`)).toBeVisible();

    // Verify we have one done task and one undone task
    await expect(page.locator(`${TASK}.isDone`)).toHaveCount(1);
    await expect(page.locator(`${TASK}:not(.isDone)`)).toHaveCount(1);
  });

  test('should handle task title updates', async ({ page, workViewPage }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Create a task
    await workViewPage.addTask('Original title');
    await page.waitForSelector(TASK, { state: 'visible' });

    // Update the task title multiple times
    await page.click(`${FIRST_TASK} textarea`);
    await page.fill(`${FIRST_TASK} textarea`, 'Updated title 1');
    await page.keyboard.press('Tab');
    await expect(page.locator(`${FIRST_TASK} textarea`)).toHaveValue(/Updated title 1/);

    // Update again
    await page.click(`${FIRST_TASK} textarea`);
    await page.fill(`${FIRST_TASK} textarea`, 'Final title');
    await page.keyboard.press('Tab');
    await expect(page.locator(`${FIRST_TASK} textarea`)).toHaveValue(/Final title/);
  });
});

import { test, expect } from '../../fixtures/app.fixture';

test.describe('Simple Subtask', () => {
  test.skip('should create subtask with keyboard shortcut', async ({
    page,
    workViewPage,
  }) => {
    // Add parent task
    await workViewPage.addTask('Parent Task');

    // Wait for task to appear
    const task = page.locator('task').first();
    await task.waitFor({ state: 'visible' });

    // Focus on the task textarea
    const taskTextarea = task.locator('textarea').first();
    await taskTextarea.focus();

    // Press 'a' to create subtask
    await page.keyboard.press('a');
    await page.waitForTimeout(1000);

    // Type subtask content and press Enter
    await page.keyboard.type('Sub Task 1');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Verify subtask was created
    const subTasksContainer = task.locator('.sub-tasks');
    await subTasksContainer.waitFor({ state: 'visible' });

    const subTask = task.locator('.sub-tasks task').first();
    await subTask.waitFor({ state: 'visible' });

    const subTaskTextarea = subTask.locator('textarea');
    await expect(subTaskTextarea).toHaveValue('Sub Task 1');
  });
});

import { test, expect } from '../../fixtures/test.fixture';

test.describe('Simple Subtask', () => {
  test('should create subtask with keyboard shortcut', async ({ page, workViewPage }) => {
    // Add parent task
    await workViewPage.addTask('Parent Task');

    // Wait for task to be visible
    await page.waitForSelector('task', { state: 'visible' });

    // Focus on the task textarea
    const taskTextarea = page.locator('task textarea').first();
    await taskTextarea.focus();

    // Send 'a' key to create subtask
    await page.keyboard.press('a');

    // Type the subtask content
    await page.keyboard.type('Sub Task 1');
    await page.keyboard.press('Enter');

    // Wait for subtasks container to be visible
    await page.waitForSelector('task .sub-tasks', { state: 'visible' });
    await page.waitForSelector('task .sub-tasks task', { state: 'visible' });

    // Verify subtask was created with correct content
    const subtaskTextarea = page.locator('task .sub-tasks task textarea');
    await expect(subtaskTextarea).toHaveValue('Sub Task 1');
  });
});

import { expect, test } from '../../fixtures/test.fixture';

test.describe('Simple Subtask', () => {
  test('should create subtask with keyboard shortcut', async ({ page, workViewPage }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Add parent task
    await workViewPage.addTask('Parent Task');

    // Wait for task to be visible
    await page.waitForSelector('task', { state: 'visible' });

    // Focus on the task textarea
    const taskTextarea = page.locator('task textarea').first();
    await taskTextarea.focus();

    // After adding task, the textarea should be focused
    // Send 'a' directly to create subtask
    await page.keyboard.type('a');
    await page.waitForTimeout(1000);

    // Now type the subtask content directly
    await page.keyboard.type('Sub Task 1');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Wait for subtask elements to be visible
    await page.waitForSelector('task .sub-tasks', { state: 'visible' });
    await page.waitForSelector('task .sub-tasks task', { state: 'visible' });

    // Assert subtask content
    const subtaskTextarea = page.locator('task .sub-tasks task textarea');
    await expect(subtaskTextarea).toHaveValue('Sub Task 1');
  });
});

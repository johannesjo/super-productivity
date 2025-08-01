import { expect, test } from '../../fixtures/test.fixture';

test.describe('Simple Subtask', () => {
  test('should create subtask with keyboard shortcut', async ({ page, workViewPage }) => {
    // Add parent task
    await workViewPage.addTask('Parent Task');

    const task = page.locator('task');

    await workViewPage.addSubTask(task, 'SubTask 1');

    const subTask = task.locator('.sub-tasks task');
    await subTask.waitFor({ state: 'visible' });

    // Verify subtask was created with correct content
    const subtaskTextarea = subTask.locator('textarea');
    await expect(subtaskTextarea).toHaveValue('SubTask 1');
  });
});

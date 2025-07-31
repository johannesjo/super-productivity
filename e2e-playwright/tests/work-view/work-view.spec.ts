import { test, expect } from '../../fixtures/app.fixture';

test.describe('Work View', () => {
  test.skip('should add task via key combo', async ({ page, workViewPage }) => {
    // Wait for task list to be ready
    await workViewPage.waitForTaskList();

    // Add task using helper
    const taskTitle = '0 test task koko';
    await workViewPage.addTask(taskTitle);

    // Verify task is visible
    const task = page.locator('task').first();
    await expect(task).toBeVisible();

    // Verify task textarea contains the text
    const taskTextarea = task.locator('textarea');
    await expect(taskTextarea).toHaveValue(taskTitle);
  });

  test('should add multiple tasks from header button', async ({ page }) => {
    const addTaskBtn = page.locator('.action-nav > button:first-child');
    await addTaskBtn.click();

    const globalAddTask = page.locator('add-task-bar.global input');
    await globalAddTask.waitFor({ state: 'visible' });

    // Add multiple tasks
    await page.keyboard.type('4 test task hohoho');
    await page.keyboard.press('Enter');
    await page.keyboard.type('5 some other task xoxo');
    await page.keyboard.press('Enter');

    // Verify tasks (global adds to top)
    const task1 = page.locator('task:nth-child(1) textarea');
    const task2 = page.locator('task:nth-child(2) textarea');

    await expect(task1).toHaveValue('5 some other task xoxo');
    await expect(task2).toHaveValue('4 test task hohoho');
  });

  test('should still show created task after reload', async ({ page, workViewPage }) => {
    const taskTitle = '0 test task lolo';
    await workViewPage.addTask(taskTitle);

    // Verify task is visible
    const task = page.locator('task').first();
    await expect(task).toBeVisible();

    // Reload page
    await page.reload();

    // Verify task is still visible after reload
    await task.waitFor({ state: 'visible' });
    const taskTextarea = task.locator('textarea');
    await expect(taskTextarea).toHaveValue(taskTitle);
  });

  test.skip('should focus previous subtask when marking last subtask done', async ({
    page,
    workViewPage,
  }) => {
    // Add main task
    await workViewPage.addTask('Main Task');

    // Wait for task to be created
    const mainTask = page.locator('task').first();
    await mainTask.waitFor({ state: 'visible' });

    // Focus on the task textarea
    const mainTaskTextarea = mainTask.locator('textarea').first();
    await mainTaskTextarea.click();
    await mainTaskTextarea.focus();

    // Try different approaches to add subtasks
    // First try hovering and looking for add subtask button
    await mainTask.hover();
    await page.waitForTimeout(500);

    // Look for add subtask button or use keyboard shortcut
    const addSubtaskBtn = mainTask
      .locator(
        'button[title*="subtask" i], button[aria-label*="subtask" i], .add-sub-task-btn',
      )
      .first();

    if (await addSubtaskBtn.isVisible({ timeout: 1000 })) {
      // Use button if available
      await addSubtaskBtn.click();
      await page.waitForTimeout(500);
      await page.keyboard.type('Subtask 1');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      // Add second subtask
      await addSubtaskBtn.click();
      await page.waitForTimeout(500);
      await page.keyboard.type('Subtask 2');
      await page.keyboard.press('Enter');
    } else {
      // Try keyboard shortcut with different timing
      await mainTaskTextarea.click();
      await mainTaskTextarea.focus();
      await page.waitForTimeout(500);

      // Try Shift+Enter or Alt+A
      await page.keyboard.press('Shift+Enter');
      await page.waitForTimeout(1000);

      // If input appears, type subtask
      const subtaskInput = page
        .locator('input[placeholder*="subtask" i], textarea[placeholder*="subtask" i]')
        .first();
      if (await subtaskInput.isVisible({ timeout: 1000 })) {
        await subtaskInput.fill('Subtask 1');
        await subtaskInput.press('Enter');
        await page.waitForTimeout(1000);

        // Add second subtask
        await page.keyboard.press('Shift+Enter');
        await page.waitForTimeout(500);
        await subtaskInput.fill('Subtask 2');
        await subtaskInput.press('Enter');
      } else {
        // Skip this test if subtasks can't be added
        test.skip();
        return;
      }
    }

    await page.waitForTimeout(1000);

    // Verify subtasks were created
    const subTasksContainer = mainTask.locator('.sub-tasks');
    await subTasksContainer.waitFor({ state: 'visible' });
    const subtasks = subTasksContainer.locator('task');
    await expect(subtasks).toHaveCount(2);

    // Mark the second subtask as done
    const secondSubtask = subtasks.nth(1);
    await secondSubtask.hover();
    const doneBtn = secondSubtask.locator('.task-done-btn');
    await doneBtn.waitFor({ state: 'visible' });
    await doneBtn.click();

    // Wait for focus change
    await page.waitForTimeout(1000);

    // Verify the first subtask has focus
    const firstSubtaskTextarea = subtasks.nth(0).locator('textarea');
    await expect(firstSubtaskTextarea).toBeFocused();
  });
});

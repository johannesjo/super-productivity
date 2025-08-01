import { expect, test } from '../../fixtures/test.fixture';

test.describe('Work View', () => {
  test('should add task via key combo', async ({ page, workViewPage }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Add a task
    await workViewPage.addTask('0 test task koko');

    // Verify task is visible
    const task = page.locator('task').first();
    await expect(task).toBeVisible();

    // Verify task content
    const taskTextarea = task.locator('textarea');
    await expect(taskTextarea).toHaveValue('0 test task koko');
  });

  test('should still show created task after reload', async ({ page, workViewPage }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Add a task
    await workViewPage.addTask('0 test task lolo');

    // Verify task is visible
    const task = page.locator('task').first();
    await expect(task).toBeVisible();

    // Reload the page
    await page.reload();

    // Wait for work view to be ready again
    await workViewPage.waitForTaskList();

    // Verify task is still visible after reload
    await expect(task).toBeVisible();
    const taskTextarea = task.locator('textarea');
    await expect(taskTextarea).toHaveValue('0 test task lolo');
  });

  test('should add multiple tasks from header button', async ({ page, workViewPage }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Click the add button in the header to open global add task input
    const headerAddBtn = page.locator('.tour-addBtn');
    await headerAddBtn.click();

    // Wait for global input to be visible
    await workViewPage.addTaskGlobalInput.waitFor({ state: 'visible' });

    // Add first task
    await workViewPage.addTaskGlobalInput.fill('4 test task hohoho');
    await page.keyboard.press('Enter');

    // Add second task
    await workViewPage.addTaskGlobalInput.fill('5 some other task xoxo');
    await page.keyboard.press('Enter');

    // Close the input by clicking backdrop
    if (await workViewPage.backdrop.isVisible()) {
      await workViewPage.backdrop.click();
    }

    // Verify both tasks are visible
    const tasks = page.locator('task');
    await expect(tasks).toHaveCount(2);

    // NOTE: global adds to top rather than bottom
    await expect(tasks.nth(0).locator('textarea')).toHaveValue('5 some other task xoxo');
    await expect(tasks.nth(1).locator('textarea')).toHaveValue('4 test task hohoho');
  });

  test('should add 2 tasks from initial bar', async ({ page, workViewPage }) => {
    test.setTimeout(20000);

    // Wait for work view to be ready
    await workViewPage.waitForTaskList();
    await page.waitForTimeout(2000); // Wait for UI to stabilize

    // Simply add two tasks using the standard method
    await workViewPage.addTask('2 test task hihi');
    await page.waitForTimeout(500);

    await workViewPage.addTask('3 some other task');
    await page.waitForTimeout(500);

    // Verify both tasks are visible
    const tasks = page.locator('task');
    await expect(tasks).toHaveCount(2);

    // Verify task order (most recent first due to global add)
    await expect(tasks.nth(0).locator('textarea')).toHaveValue('3 some other task');
    await expect(tasks.nth(1).locator('textarea')).toHaveValue('2 test task hihi');
  });
});

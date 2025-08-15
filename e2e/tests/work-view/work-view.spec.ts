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

    // Verify task content (accounting for test prefix)
    const taskTextarea = task.locator('textarea');
    await expect(taskTextarea).toHaveValue(/.*0 test task koko/);
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
    await expect(taskTextarea).toHaveValue(/.*0 test task lolo/);
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
    await expect(tasks.nth(0).locator('textarea')).toHaveValue(
      /.*5 some other task xoxo/,
    );
    await expect(tasks.nth(1).locator('textarea')).toHaveValue(/.*4 test task hohoho/);
  });

  test('should add 2 tasks from initial bar', async ({ page, workViewPage }) => {
    test.setTimeout(30000); // Increase timeout

    // Wait for work view to be ready
    await workViewPage.waitForTaskList();
    await page.waitForTimeout(1000); // Give UI time to fully initialize

    // Add two tasks - the addTask method now properly waits for each one
    await workViewPage.addTask('test task hihi');
    await workViewPage.addTask('some other task here');

    // Verify both tasks are visible
    const tasks = page.locator('task');
    await expect(tasks).toHaveCount(2, { timeout: 10000 });

    // Get all task textareas and their values
    const taskTextareas = await tasks.locator('textarea').all();
    const taskContents: string[] = [];

    for (const textarea of taskTextareas) {
      try {
        const value = await textarea.inputValue();
        taskContents.push(value);
      } catch (e) {
        // console.log('Failed to get textarea value:', e);
      }
    }

    // Debug log to see what we actually have
    // console.log('Number of tasks found:', await tasks.count());
    // console.log('Task contents found:', taskContents);

    // Check that both tasks are present (look for key parts that would be in any version)
    const hasHihi = taskContents.some((v) => v.includes('hihi'));
    const hasOther = taskContents.some((v) => v.includes('other task'));

    // More detailed assertion for debugging
    if (!hasHihi || !hasOther) {
      // console.log('Missing expected tasks. Found:', taskContents);
      // console.log('hasHihi:', hasHihi, 'hasOther:', hasOther);
    }

    expect(hasHihi).toBe(true);
    expect(hasOther).toBe(true);
  });
});

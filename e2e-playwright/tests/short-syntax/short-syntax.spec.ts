import { test, expect } from '../../fixtures/app.fixture';

test.describe('Short Syntax', () => {
  test.skip('should add task with project via short syntax', async ({
    page,
    workViewPage,
  }) => {
    await workViewPage.waitForTaskList();

    // Add task with project short syntax
    await workViewPage.addTask('0 test task koko +i');

    // Verify task is visible
    const task = page.locator('task').first();
    await expect(task).toBeVisible();

    // Verify task has the Inbox tag
    const taskTags = task.locator('tag');
    await expect(taskTags).toContainText('Inbox');
  });

  test.skip('should add a task with repeated tags but only append one instance', async ({
    page,
    tagPage,
    workViewPage,
  }) => {
    await workViewPage.waitForTaskList();

    // Add task with duplicate tags
    await workViewPage.addTask('Test creating new tag #duplicateTag #duplicateTag', true);

    // Confirm tag creation if dialog appears
    await tagPage.confirmTagCreation();

    // Wait for the task to be created
    await page.waitForTimeout(1000);

    // Find the task we just created
    const task = page
      .locator('task')
      .filter({ hasText: 'Test creating new tag' })
      .first();
    await task.waitFor({ state: 'visible' });

    // Count how many times 'duplicateTag' appears in the task's tags
    const duplicateTags = task
      .locator('tag-list tag')
      .filter({ hasText: 'duplicateTag' });
    const duplicateTagCount = await duplicateTags.count();

    console.log('Number of duplicateTag instances found:', duplicateTagCount);

    // Assert that duplicateTag only appears once (no duplicates)
    expect(duplicateTagCount).toBe(1);
  });
});

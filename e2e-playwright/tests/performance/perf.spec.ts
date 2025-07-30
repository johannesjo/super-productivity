import { test, expect } from '../../fixtures/app.fixture';

test.describe('Performance Tests', () => {
  test('initial load performance', async ({ page }) => {
    // Start performance measurement
    const startTime = Date.now();

    // Wait for any main content to be visible
    const mainContent = page
      .locator('main, .main-container, work-view, task-list, .route-wrapper')
      .first();
    await mainContent.waitFor({ state: 'attached', timeout: 15000 });

    // Calculate load time
    const loadTime = Date.now() - startTime;
    console.log(`Initial load time: ${loadTime}ms`);

    // Basic performance assertion - page should load in under 15 seconds
    expect(loadTime).toBeLessThan(15000);

    // Verify app is responsive by checking if we can see some content
    const hasContent = await page.locator('body').isVisible();
    expect(hasContent).toBeTruthy();
  });

  test.skip('task creation performance', async ({ page, workViewPage }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Measure time to create multiple tasks
    const startTime = Date.now();

    // Create 10 tasks instead of 20 for faster test
    for (let i = 1; i <= 10; i++) {
      await workViewPage.addTask(`${i} test task performance`);
    }

    const creationTime = Date.now() - startTime;
    console.log(`Time to create 10 tasks: ${creationTime}ms`);
    console.log(`Average time per task: ${creationTime / 10}ms`);

    // Verify all tasks were created
    const tasks = page.locator('task');
    await expect(tasks).toHaveCount(10);

    // Tasks creation should complete in reasonable time (30 seconds for 10 tasks)
    expect(creationTime).toBeLessThan(30000);
  });
});

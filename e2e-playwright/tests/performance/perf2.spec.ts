import { test, expect } from '../../fixtures/app.fixture';

test.describe('Performance Tests - Adding Multiple Tasks', () => {
  test('performance: adding 20 tasks sequentially', async ({ page, workViewPage }) => {
    // Set a longer timeout for this performance test
    test.setTimeout(120000); // 2 minutes

    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Start performance measurement
    const startTime = performance.now();

    // Add 20 tasks sequentially
    for (let i = 1; i <= 20; i++) {
      await workViewPage.addTask(`${i} test task koko`);
    }

    // Calculate total time
    const totalTime = performance.now() - startTime;

    // Log performance metrics (only if test fails or in verbose mode)
    // console.log(`Time to create 20 tasks: ${totalTime.toFixed(2)}ms`);
    // console.log(`Average time per task: ${(totalTime / 20).toFixed(2)}ms`);

    // Verify all tasks were created
    const tasks = page.locator('task');
    await expect(tasks).toHaveCount(20);

    // Performance assertion - 20 tasks should be created in under 60 seconds
    expect(totalTime).toBeLessThan(60000);
  });
});

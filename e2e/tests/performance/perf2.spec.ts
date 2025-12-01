import { expect, test } from '../../fixtures/test.fixture';

test.describe.serial('Performance Tests - Adding Multiple Tasks', () => {
  test.skip('performance: adding 20 tasks sequentially', async ({
    page,
    workViewPage,
  }) => {
    // Set a longer timeout for this performance test (even longer in CI)
    test.setTimeout(process.env.CI ? 120000 : 60000);

    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Start performance measurement
    const startTime = performance.now();

    // Add 20 tasks sequentially
    for (let i = 1; i <= 20; i++) {
      // Keep the add task dialog open for all tasks except the last one
      const isLastTask = i === 20;
      await workViewPage.addTask(`${i} test task koko`, !isLastTask);
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

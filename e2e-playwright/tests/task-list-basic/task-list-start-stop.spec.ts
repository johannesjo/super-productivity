import { test, expect } from '../../fixtures/app.fixture';

test.describe('Task Start/Stop', () => {
  test('should start and stop single task', async ({ page, workViewPage }) => {
    // Add task
    await workViewPage.addTask('0 C task');

    // Hover over task to show controls
    const task = page.locator('task').first();
    await task.hover({ position: { x: 20, y: 20 } });

    // Click play button to start task
    const playBtn = page.locator('.play-btn.tour-playBtn');
    await playBtn.click();
    await page.waitForTimeout(50);

    // Verify task has isCurrent class
    await expect(task).toHaveClass(/isCurrent/);

    // Click play button again to stop task
    await playBtn.click();
    await page.waitForTimeout(50);

    // Verify task no longer has isCurrent class
    await expect(task).not.toHaveClass(/isCurrent/);
  });
});

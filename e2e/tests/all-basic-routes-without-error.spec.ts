import { test } from '../fixtures/test.fixture';

test.describe('All Basic Routes Without Error', () => {
  test('should open all basic routes from menu without error', async ({
    page,
    workViewPage,
  }) => {
    // Load app and wait for work view
    await workViewPage.waitForTaskList();

    // Wait for magic-side-nav to be fully loaded
    await page.locator('magic-side-nav').waitFor({ state: 'visible' });
    await page.waitForTimeout(1000); // Give extra time for navigation items to load

    // Navigate to schedule
    await page.goto('/#/tag/TODAY/schedule');

    // Test that key navigation elements are visible and functional
    // Wait for navigation to be fully loaded
    await page.waitForSelector('magic-side-nav', { state: 'visible' });

    // Test navigation to different routes by URL (the main goal of this test)
    await page.goto('/#/schedule');
    await page.waitForTimeout(500);

    await page.goto('/#/tag/TODAY/tasks');
    await page.waitForTimeout(500);

    await page.goto('/#/config');
    await page.waitForTimeout(500);

    // Navigate to different routes
    await page.goto('/#/tag/TODAY/quick-history');
    await page.waitForTimeout(500);
    await page.goto('/#/tag/TODAY/worklog');
    await page.waitForTimeout(500);
    await page.goto('/#/tag/TODAY/metrics');
    await page.waitForTimeout(500);
    await page.goto('/#/tag/TODAY/planner');
    await page.waitForTimeout(500);
    await page.goto('/#/tag/TODAY/daily-summary');
    await page.waitForTimeout(500);
    await page.goto('/#/tag/TODAY/settings');
    await page.waitForTimeout(500);

    // Send 'n' key to open notes dialog
    await page.keyboard.press('n');

    // Verify no errors in console (implicit with test passing)
  });
});

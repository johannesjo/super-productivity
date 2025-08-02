import { test } from '../fixtures/test.fixture';

const CANCEL_BTN = 'mat-dialog-actions button:first-child';

test.describe('All Basic Routes Without Error', () => {
  test('should open all basic routes from menu without error', async ({
    page,
    workViewPage,
  }) => {
    // Load app and wait for work view
    await workViewPage.waitForTaskList();

    // Navigate to schedule
    await page.goto('/#/tag/TODAY/schedule');

    // Click main side nav item
    await page.click('side-nav section.main > side-nav-item > button');
    await page.locator('side-nav section.main > button').nth(0).click();
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);

    await page.locator('side-nav section.main > button').nth(1).click();

    await page.click('side-nav section.projects button');
    await page.click('side-nav section.tags button');

    await page.locator('side-nav section.app > button').nth(0).click();
    await page.click('button.tour-settingsMenuBtn');

    // Navigate to different routes
    await page.goto('/#/tag/TODAY/quick-history');
    await page.waitForLoadState('networkidle');
    await page.goto('/#/tag/TODAY/worklog');
    await page.waitForLoadState('networkidle');
    await page.goto('/#/tag/TODAY/metrics');
    await page.waitForLoadState('networkidle');
    await page.goto('/#/tag/TODAY/planner');
    await page.waitForLoadState('networkidle');
    await page.goto('/#/tag/TODAY/daily-summary');
    await page.waitForLoadState('networkidle');
    await page.goto('/#/tag/TODAY/settings');
    await page.waitForLoadState('networkidle');

    // Send 'n' key to open notes dialog
    await page.keyboard.press('n');

    // Verify no errors in console (implicit with test passing)
  });
});

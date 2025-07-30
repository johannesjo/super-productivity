import { test, expect } from '../fixtures/app.fixture';
import { AppHelpers } from '../helpers/app-helpers';

test.describe('Basic Routes Navigation', () => {
  test.skip('should open all basic routes from menu without error', async ({ page }) => {
    // The app.fixture automatically loads app and dismisses welcome

    // Navigate to schedule
    await page.goto('/#/tag/TODAY/schedule');

    // Test main navigation items
    await page.click('side-nav section.main > side-nav-item > button');
    await page.click('side-nav section.main > button:nth-of-type(1)');

    // Wait for and cancel dialog
    const cancelBtn = page.locator('mat-dialog-actions button:nth-of-type(1)');
    await cancelBtn.waitFor({ state: 'visible' });
    await cancelBtn.click();

    // Continue navigation
    await page.click('side-nav section.main > button:nth-of-type(2)');

    // Project and tags sections
    await page.click('side-nav section.projects button');
    await page.click('side-nav section.tags button');

    // App section
    await page.click('side-nav section.app > button:nth-of-type(1)');
    await page.click('button.tour-settingsMenuBtn');

    // Navigate through different routes
    const routes = [
      '/#/tag/TODAY/quick-history',
      '/#/tag/TODAY/worklog',
      '/#/tag/TODAY/metrics',
      '/#/tag/TODAY/planner',
      '/#/tag/TODAY/daily-summary',
      '/#/tag/TODAY/settings',
    ];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForTimeout(500);
    }

    // Open notes dialog with keyboard shortcut
    await page.keyboard.press('n');

    // Check for errors
    const hasErrors = await AppHelpers.checkNoErrors(page);
    expect(hasErrors).toBeTruthy();
  });
});

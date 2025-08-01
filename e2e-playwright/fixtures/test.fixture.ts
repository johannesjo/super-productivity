import { test as base } from '@playwright/test';
import { WorkViewPage } from '../pages/work-view.page';

type TestFixtures = {
  workViewPage: WorkViewPage;
};

export const test = base.extend<TestFixtures>({
  page: async ({ page }, use) => {
    // Navigate to the app first
    await page.goto('/');

    // Set localStorage after navigation to avoid cross-origin issues
    // Note: The app checks for the presence of this key, not its value
    await page.evaluate(() => {
      window.localStorage.setItem('SUP_IS_SHOW_TOUR', 'true');
    });

    // Wait a bit for the app to process localStorage
    await page.waitForTimeout(500);

    // Double-check: Dismiss any tour dialog if it still appears
    const tourDialog = page.locator('[data-shepherd-step-id="Welcome"]');
    if (await tourDialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      const cancelBtn = page.locator(
        'button:has-text("No thanks"), .shepherd-cancel-icon, .shepherd-button-secondary',
      );
      if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cancelBtn.click();
        await page.waitForTimeout(500);
      }
    }

    await use(page);
  },

  workViewPage: async ({ page }, use) => {
    await use(new WorkViewPage(page));
  },
});

export { expect } from '@playwright/test';

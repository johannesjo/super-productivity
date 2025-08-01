import { test as base, BrowserContext } from '@playwright/test';
import { WorkViewPage } from '../pages/work-view.page';

type TestFixtures = {
  workViewPage: WorkViewPage;
  isolatedContext: BrowserContext;
  testPrefix: string;
};

export const test = base.extend<TestFixtures>({
  // Create isolated context for each test
  isolatedContext: async ({ browser }, use, testInfo) => {
    // Create a new context with isolated storage
    const context = await browser.newContext({
      // Each test gets its own storage state
      storageState: undefined,
      // Add worker index to user agent for debugging
      userAgent: `PLAYWRIGHT-WORKER-${testInfo.workerIndex}`,
    });

    await use(context);

    // Cleanup
    await context.close();
  },

  // Override page to use isolated context
  page: async ({ isolatedContext }, use) => {
    const page = await isolatedContext.newPage();

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

    // Cleanup
    await page.close();
  },

  // Provide test prefix for data namespacing
  testPrefix: async ({}, use, testInfo) => {
    // Use worker index and parallel index for unique prefixes
    const prefix = `W${testInfo.workerIndex}-P${testInfo.parallelIndex}`;
    await use(prefix);
  },

  workViewPage: async ({ page, testPrefix }, use) => {
    await use(new WorkViewPage(page, testPrefix));
  },
});

export { expect } from '@playwright/test';

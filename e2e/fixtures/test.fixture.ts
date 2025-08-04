import { BrowserContext, test as base } from '@playwright/test';
import { WorkViewPage } from '../pages/work-view.page';
import { ProjectPage } from '../pages/project.page';

type TestFixtures = {
  workViewPage: WorkViewPage;
  projectPage: ProjectPage;
  isolatedContext: BrowserContext;
  waitForNav: (selector?: string) => Promise<void>;
  testPrefix: string;
};

export const test = base.extend<TestFixtures>({
  // Create isolated context for each test
  isolatedContext: async ({ browser }, use, testInfo) => {
    // Create a new context with isolated storage
    const context = await browser.newContext({
      // Each test gets its own storage state
      storageState: undefined,
      // Preserve the base userAgent and add worker index for debugging
      userAgent: `PLAYWRIGHT PLAYWRIGHT-WORKER-${testInfo.workerIndex}`,
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

    // Wait for app to be ready
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('body', { state: 'visible' });

    // Wait for the app to react to the localStorage change
    await page.waitForLoadState('domcontentloaded');

    // Double-check: Dismiss any tour dialog if it still appears
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

  projectPage: async ({ page, testPrefix }, use) => {
    await use(new ProjectPage(page, testPrefix));
  },

  waitForNav: async ({ page }, use) => {
    const waitForNav = async (selector?: string): Promise<void> => {
      await page.waitForLoadState('networkidle');
      if (selector) {
        await page.waitForSelector(selector);
        await page.waitForTimeout(100);
      } else {
        // Wait for the main app container to be stable
        await page.locator('.route-wrapper').waitFor({ state: 'visible' });
        await page.waitForTimeout(200);
      }
    };
    await use(waitForNav);
  },
});

export { expect } from '@playwright/test';

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

    try {
      // Set up error handling
      page.on('pageerror', (error) => {
        console.error('Page error:', error.message);
      });

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          console.error('Console error:', msg.text());
        }
      });

      // Navigate to the app first
      await page.goto('/');

      // Wait for app shell and navigation to be ready and stable
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('body', { state: 'visible' });
      await page.waitForSelector('magic-side-nav', { state: 'visible', timeout: 15000 });
      // Ensure we are on a work-view route and the DOM is settled
      await page
        .waitForURL(/#\/(tag|project)\/.+\/tasks/, { timeout: 15000 })
        .catch(() => {});
      await page.waitForLoadState('networkidle');
      await page.locator('.route-wrapper').first().waitFor({ state: 'visible' });
      // Only wait for the global add input if it's already present
      const addTaskInput = page.locator('add-task-bar.global input');
      try {
        if ((await addTaskInput.count()) > 0) {
          await addTaskInput.first().waitFor({ state: 'visible', timeout: 3000 });
        }
      } catch {
        // Non-fatal: not all routes show the global add input immediately
      }

      // Double-check: Dismiss any tour dialog if it still appears
      await use(page);
    } finally {
      // Cleanup - make sure context is still available
      if (!page.isClosed()) {
        await page.close();
      }
    }
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

import { BrowserContext, test as base } from '@playwright/test';
import { WorkViewPage } from '../pages/work-view.page';
import { ProjectPage } from '../pages/project.page';
import { waitForAppReady } from '../utils/waits';

type TestFixtures = {
  workViewPage: WorkViewPage;
  projectPage: ProjectPage;
  isolatedContext: BrowserContext;
  waitForNav: (selector?: string) => Promise<void>;
  testPrefix: string;
};

export const test = base.extend<TestFixtures>({
  // Create isolated context for each test
  isolatedContext: async ({ browser, baseURL }, use, testInfo) => {
    const url = baseURL || testInfo.project.use.baseURL || 'http://localhost:4242';
    // Create a new context with isolated storage
    const context = await browser.newContext({
      // Each test gets its own storage state
      storageState: undefined,
      // Preserve the base userAgent and add worker index for debugging
      userAgent: `PLAYWRIGHT PLAYWRIGHT-WORKER-${testInfo.workerIndex}`,
      baseURL: url,
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

      // Navigate to the app with retry logic
      let navigationSuccess = false;
      for (let attempt = 0; attempt < 3 && !navigationSuccess; attempt++) {
        try {
          await page.goto('/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          });
          navigationSuccess = true;
        } catch (error) {
          if (attempt === 2) throw error;
          console.log(`Navigation attempt ${attempt + 1} failed, retrying...`);
          await page.waitForTimeout(1000);
        }
      }

      await waitForAppReady(page);

      // Only wait for the global add input if it's already present
      const addTaskInput = page.locator('add-task-bar.global input');
      try {
        const inputCount = await addTaskInput.count();
        if (inputCount > 0) {
          await addTaskInput.first().waitFor({ state: 'visible', timeout: 3000 });
        }
      } catch {
        // Non-fatal: not all routes show the global add input immediately
      }

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
      await waitForAppReady(page, {
        ensureRoute: false,
        selector,
      });
    };
    await use(waitForNav);
  },
});

export { expect } from '@playwright/test';

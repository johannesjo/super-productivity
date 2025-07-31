import { test as base } from '@playwright/test';
import { WorkViewPage } from '../pages/work-view.page';

type TestFixtures = {
  workViewPage: WorkViewPage;
};

export const test = base.extend<TestFixtures>({
  page: async ({ page }, use) => {
    // Set localStorage before any navigation
    await page.addInitScript(() => {
      window.localStorage.setItem('SUP_IS_SHOW_TOUR', 'true');
    });
    // Navigate to the app
    await page.goto('/');
    await use(page);
  },

  workViewPage: async ({ page }, use) => {
    await use(new WorkViewPage(page));
  },
});

export { expect } from '@playwright/test';

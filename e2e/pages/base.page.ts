import { type Locator, type Page } from '@playwright/test';

export abstract class BasePage {
  protected page: Page;
  protected routerWrapper: Locator;
  protected backdrop: Locator;
  protected testPrefix: string;

  constructor(page: Page, testPrefix: string = '') {
    this.page = page;
    this.routerWrapper = page.locator('.route-wrapper');
    this.backdrop = page.locator('.backdrop');
    this.testPrefix = testPrefix;
  }

  async addTask(taskName: string, skipClose = false): Promise<void> {
    await this.routerWrapper.waitFor({ state: 'visible' });

    // Add test prefix to task name for isolation
    const prefixedTaskName = this.testPrefix
      ? `${this.testPrefix}-${taskName}`
      : taskName;

    const inputEl = this.page.locator('add-task-bar.global input');

    if ((await inputEl.count()) === 0) {
      const addBtn = this.page.locator('.tour-addBtn');
      await addBtn.waitFor({ state: 'visible' });
      await addBtn.click();
      await inputEl.waitFor({ state: 'visible' });
    }

    await inputEl.clear();
    await inputEl.fill(prefixedTaskName);

    const submitBtn = this.page.locator('.e2e-add-task-submit');
    await submitBtn.waitFor({ state: 'visible' });
    await submitBtn.click();

    // Wait for the task to appear in the DOM
    await this.page
      .waitForSelector(`text="${prefixedTaskName}"`, {
        timeout: 2000,
        state: 'visible',
      })
      .catch(() => {
        // If the exact text is not found, that's okay - task might be processed differently
      });

    if (!skipClose) {
      // Only click backdrop once if it's visible
      if (await this.backdrop.isVisible()) {
        await this.backdrop.click();
        // Wait for backdrop to be hidden
        await this.backdrop.waitFor({ state: 'hidden', timeout: 1000 }).catch(() => {});
      }
      // Don't wait for input to be hidden as it might stay visible for multiple tasks
    }
  }
}

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
      await this.page.locator('.tour-addBtn ').click();
      await inputEl.waitFor({ state: 'visible' });
    }

    await inputEl.fill(prefixedTaskName);
    await this.page.locator('.e2e-add-task-submit ').click();

    // Wait for the task to be added
    await this.page.waitForTimeout(10);

    if (!skipClose) {
      // Only click backdrop once if it's visible
      if (await this.backdrop.isVisible()) {
        await this.backdrop.click();
      }
      // Don't wait for input to be hidden as it might stay visible for multiple tasks
    }
  }
}

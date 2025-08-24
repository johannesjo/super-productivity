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

    // Store the initial count BEFORE submitting
    const initialCount = await this.page.locator('task').count();

    // Wait for the submit button to become visible (it appears only when input has text)
    const submitBtn = this.page.locator('.e2e-add-task-submit');
    await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
    await submitBtn.click();

    // Check if a dialog appeared (e.g., create tag dialog)
    const dialogExists = await this.page
      .locator('mat-dialog-container')
      .isVisible()
      .catch(() => false);

    if (!dialogExists) {
      // Wait for task count to increase only if no dialog appeared
      await this.page.waitForFunction(
        (expectedCount) => document.querySelectorAll('task').length > expectedCount,
        initialCount,
        { timeout: 10000 },
      );
    } else {
      // If dialog appeared, give a small delay for it to fully render
      await this.page.waitForTimeout(500);
    }

    // Give extra time for task to be fully persisted
    await this.page.waitForTimeout(1000);

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

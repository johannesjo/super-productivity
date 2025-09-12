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

    // Add test prefix to task name for isolation only if not already prefixed
    const prefixedTaskName =
      this.testPrefix && !taskName.startsWith(this.testPrefix)
        ? `${this.testPrefix}-${taskName}`
        : taskName;

    const inputEl = this.page.locator('add-task-bar.global input');

    // If the global input is not present, open the Add Task Bar first
    if ((await inputEl.count()) === 0) {
      const addBtn = this.page.locator('.tour-addBtn');
      await addBtn.waitFor({ state: 'visible' });
      await addBtn.click();
    }

    // Ensure input is visible before interacting (handles dev-server reloads)
    await inputEl.first().waitFor({ state: 'visible', timeout: 15000 });

    // Retry once if navigation/reload happens during typing
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await inputEl.clear();
        await inputEl.fill(prefixedTaskName);
        break;
      } catch (e) {
        // Wait for possible navigation/re-render
        await this.page.waitForLoadState('networkidle').catch(() => {});
        await inputEl.first().waitFor({ state: 'visible', timeout: 10000 });
        if (attempt === 1) throw e;
      }
    }

    // Store the initial count and get task text for verification
    const initialCount = await this.page.locator('task').count();
    const expectedCount = initialCount + 1;

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
      // Use multiple strategies to wait for task creation

      // Strategy 1: Wait for task count to increase with longer timeout
      try {
        await this.page.waitForFunction(
          (args) => {
            const currentCount = document.querySelectorAll('task').length;
            return currentCount >= args.expectedCount;
          },
          { expectedCount },
          { timeout: 10000 },
        );
      } catch (countError) {
        // Strategy 2: Look for the specific task by text content as fallback
        try {
          await this.page.waitForSelector(
            `task:has-text("${prefixedTaskName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}")`,
            { timeout: 5000 },
          );
        } catch (textError) {
          // Strategy 3: Final fallback - wait for any new task element
          await this.page.waitForSelector('task', { timeout: 3000 });
        }
      }
    } else {
      // If dialog appeared, give a small delay for it to fully render
      await this.page.waitForTimeout(500);
    }

    // Ensure the task is fully rendered and persisted
    await this.page.waitForTimeout(1500);

    // Verify task was actually created (final safety check with extended retry logic)
    let finalCount = await this.page.locator('task').count();
    let attempts = 0;
    const maxAttempts = 5;

    while (!dialogExists && finalCount < expectedCount && attempts < maxAttempts) {
      attempts++;
      console.log(
        `Task creation attempt ${attempts}/${maxAttempts}, current count: ${finalCount}, expected: ${expectedCount}`,
      );

      // Wait longer between attempts
      await this.page.waitForTimeout(2000);

      // Try to trigger change detection
      await this.page.evaluate(() => {
        // Dispatch a custom event to potentially trigger Angular change detection
        window.dispatchEvent(new Event('resize'));
      });

      await this.page.waitForTimeout(500);
      finalCount = await this.page.locator('task').count();
    }

    if (!dialogExists && finalCount < expectedCount) {
      throw new Error(
        `Task creation failed after ${maxAttempts} attempts. Expected ${expectedCount} tasks, but got ${finalCount}`,
      );
    }

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

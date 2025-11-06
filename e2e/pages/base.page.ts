import { type Locator, type Page } from '@playwright/test';
import { waitForAngularStability } from '../utils/waits';

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
    // Ensure route is stable before starting
    await this.routerWrapper.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForLoadState('domcontentloaded');

    // Add test prefix to task name for isolation only if not already prefixed
    const prefixedTaskName =
      this.testPrefix && !taskName.startsWith(this.testPrefix)
        ? `${this.testPrefix}-${taskName}`
        : taskName;

    const inputEl = this.page.locator('add-task-bar.global input');

    // If the global input is not present, open the Add Task Bar first
    const inputCount = await inputEl.count();
    if (inputCount === 0) {
      const addBtn = this.page.locator('.tour-addBtn');
      await addBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addBtn.click();
      // Wait for input to appear after clicking
      await this.page.waitForTimeout(300);
    }

    // Ensure input is visible and interactable
    await inputEl.first().waitFor({ state: 'visible', timeout: 15000 });
    await inputEl.first().waitFor({ state: 'attached', timeout: 5000 });

    // Wait for Angular to stabilize before interacting
    await waitForAngularStability(this.page);

    // Clear and fill input with retry logic
    let filled = false;
    for (let attempt = 0; attempt < 3 && !filled; attempt++) {
      try {
        if (attempt > 0) {
          await this.page.waitForTimeout(500);
          await waitForAngularStability(this.page);
        }

        // Focus and select all before clearing to ensure old value is removed
        await inputEl.first().click();
        await this.page.waitForTimeout(100);

        // Try to clear using multiple methods
        await inputEl.first().clear();
        await this.page.waitForTimeout(50);

        // Use keyboard shortcut to ensure clear
        await inputEl.first().press('Control+a');
        await this.page.waitForTimeout(50);

        await inputEl.first().fill(prefixedTaskName);
        await this.page.waitForTimeout(100);

        // Verify text was filled correctly
        const value = await inputEl.first().inputValue();
        if (value === prefixedTaskName) {
          filled = true;
        } else {
          // If value doesn't match, try once more with direct keyboard input
          await inputEl.first().clear();
          await this.page.waitForTimeout(50);
          await inputEl.first().pressSequentially(prefixedTaskName, { delay: 20 });
          const retryValue = await inputEl.first().inputValue();
          if (retryValue === prefixedTaskName) {
            filled = true;
          }
        }
      } catch (e) {
        if (attempt === 2) throw e;
        await this.page.waitForLoadState('networkidle').catch(() => {});
      }
    }

    // Store the initial count before submission
    const initialCount = await this.page.locator('task').count();
    const expectedCount = initialCount + 1;

    // Wait for submit button and click it
    const submitBtn = this.page.locator('.e2e-add-task-submit');
    await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
    await submitBtn.click();

    // Wait for Angular to process the submission
    await waitForAngularStability(this.page);

    // Check if a dialog appeared (e.g., create tag dialog)
    const dialogExists = await this.page
      .locator('mat-dialog-container')
      .isVisible()
      .catch(() => false);

    if (!dialogExists) {
      // Wait for task to be created using multiple strategies
      const taskCreated = await Promise.race([
        // Strategy 1: Wait for task count to increase
        this.page
          .waitForFunction(
            (args) => {
              const currentCount = document.querySelectorAll('task').length;
              return currentCount >= args.expectedCount;
            },
            { expectedCount },
            { timeout: 12000 },
          )
          .then(() => true)
          .catch(() => false),

        // Strategy 2: Look for the specific task by text content
        this.page
          .waitForSelector(
            `task:has-text("${prefixedTaskName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}")`,
            { timeout: 12000 },
          )
          .then(() => true)
          .catch(() => false),
      ]);

      if (!taskCreated) {
        // Final attempt: wait for Angular stability and check again
        await waitForAngularStability(this.page, 5000);
        await this.page.waitForTimeout(1000);
      }
    } else {
      // If dialog appeared, wait for it to be fully rendered
      await this.page.waitForTimeout(500);
    }

    // Final verification with detailed error reporting
    const finalCount = await this.page.locator('task').count();

    if (!dialogExists && finalCount < expectedCount) {
      // Gather debug information
      const tasks = await this.page.locator('task').all();
      const taskTexts = await Promise.all(
        tasks.map(async (t) => {
          try {
            return await t.textContent();
          } catch {
            return 'error reading text';
          }
        }),
      );

      throw new Error(
        `Task creation failed. Expected ${expectedCount} tasks, but got ${finalCount}.\n` +
          `Task name: "${prefixedTaskName}"\n` +
          `Existing tasks: ${JSON.stringify(taskTexts, null, 2)}`,
      );
    }

    if (!skipClose) {
      // Close the add task bar if backdrop is visible
      const backdropVisible = await this.backdrop.isVisible().catch(() => false);
      if (backdropVisible) {
        await this.backdrop.click();
        await this.backdrop.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {
          // Non-fatal: backdrop might auto-hide
        });
      }

      // Final small wait after closing to ensure DOM is fully settled
      await this.page.waitForTimeout(200);
    } else {
      // If not closing, still wait briefly for the task to be fully persisted
      await this.page.waitForTimeout(300);
    }
  }
}

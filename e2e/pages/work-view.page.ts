import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class WorkViewPage extends BasePage {
  readonly addTaskGlobalInput: Locator;
  readonly addBtn: Locator;
  readonly taskList: Locator;
  readonly backdrop: Locator;
  readonly routerWrapper: Locator;

  constructor(page: Page, testPrefix: string = '') {
    super(page, testPrefix);

    this.addTaskGlobalInput = page.locator('add-task-bar.global input');
    this.addBtn = page.locator('.switch-add-to-btn');
    this.taskList = page.locator('task-list').first();
    this.backdrop = page.locator('.backdrop');
    this.routerWrapper = page.locator('.route-wrapper, main, [role="main"]').first();
  }

  async waitForTaskList(): Promise<void> {
    await this.page.waitForSelector('task-list', {
      state: 'visible',
      timeout: 6000, // Reduced from 8s to 6s
    });
    // Ensure route wrapper is fully loaded
    await this.routerWrapper.waitFor({ state: 'visible' });
    // Wait for network to settle
    await this.page.waitForLoadState('networkidle');
    // If the global add-task bar is already open, wait for its input, otherwise don't block navigation
    try {
      if ((await this.addTaskGlobalInput.count()) > 0) {
        await this.addTaskGlobalInput
          .first()
          .waitFor({ state: 'visible', timeout: 3000 });
      }
    } catch {
      // Non-fatal: some routes/tests don't show the global add bar immediately
    }
  }

  async addSubTask(task: Locator, subTaskName: string): Promise<void> {
    await task.waitFor({ state: 'visible' });
    await task.focus();
    // Wait for focus to be established
    await this.page.waitForFunction(
      (el) => el === document.activeElement,
      await task.elementHandle(),
      { timeout: 1000 },
    );
    await task.press('a');

    // Wait for textarea to appear and be focused
    const textarea = this.page.locator('textarea:focus, input[type="text"]:focus');
    await textarea.waitFor({ state: 'visible', timeout: 1000 });

    // Ensure the field is properly focused and cleared before filling
    await textarea.click();
    await this.page.waitForTimeout(100);
    await textarea.fill('');
    await this.page.waitForTimeout(50);

    // Use fill() instead of type() for more reliable text input
    await textarea.fill(subTaskName);
    await this.page.waitForTimeout(100);
    await this.page.keyboard.press('Enter');
  }
}

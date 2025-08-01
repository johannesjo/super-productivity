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
      timeout: 8000,
    });
    // Wait for any initial animations/transitions
    await this.page.waitForTimeout(100);
    // Ensure route wrapper is fully loaded
    await this.routerWrapper.waitFor({ state: 'visible' });
  }

  async getTaskByTitle(title: string): Promise<Locator> {
    // Add test prefix to search
    const prefixedTitle = this.testPrefix ? `${this.testPrefix}-${title}` : title;
    return this.page.locator(`task-additional-info:has-text("${prefixedTitle}")`);
  }
}

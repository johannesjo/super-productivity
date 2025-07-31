import { type Locator, type Page } from '@playwright/test';

export abstract class BasePage {
  protected page: Page;
  protected routerWrapper: Locator;
  protected backdrop: Locator;

  constructor(page: Page) {
    this.page = page;
    this.routerWrapper = page.locator('.route-wrapper');
    this.backdrop = page.locator('.backdrop');
  }

  async addTask(taskName: string, skipClose = false): Promise<void> {
    await this.routerWrapper.waitFor({ state: 'visible' });

    const inputEl = this.page.locator('add-task-bar input');

    if ((await inputEl.count()) === 0) {
      await this.page.locator('.tour-addBtn ').click();
    }

    await inputEl.fill(taskName);
    await this.page.locator('.e2e-add-task-submit ').click();
    await this.page.locator('body').click();
    await this.page.locator('.backdrop').click();
    await this.page.waitForTimeout(200);

    if (!skipClose) {
      await this.backdrop.click();
      await inputEl.waitFor({ state: 'hidden' });
    }
  }
}

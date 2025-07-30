import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(path = '/') {
    await this.page.goto(path);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async getByTestId(testId: string): Promise<Locator> {
    return this.page.locator(`[data-testid="${testId}"]`);
  }

  async getByE2e(e2eAttr: string): Promise<Locator> {
    return this.page.locator(`[e2e="${e2eAttr}"]`);
  }

  async clickAndWait(locator: Locator) {
    await locator.click();
    await this.page.waitForLoadState('networkidle');
  }

  async fillAndSubmit(locator: Locator, text: string) {
    await locator.fill(text);
    await locator.press('Enter');
  }
}

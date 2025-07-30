import { Page, Locator } from '@playwright/test';

export class DialogComponent {
  private page: Page;
  readonly confirmBtn: Locator;
  readonly cancelBtn: Locator;
  readonly dialogContent: Locator;

  constructor(page: Page) {
    this.page = page;
    this.confirmBtn = page.locator('dialog-confirm button[e2e="confirmBtn"]');
    this.cancelBtn = page.locator('dialog-confirm button[e2e="cancelBtn"]');
    this.dialogContent = page.locator('mat-dialog-content');
  }

  async confirm() {
    await this.confirmBtn.click();
    await this.confirmBtn.waitFor({ state: 'hidden' });
  }

  async cancel() {
    await this.cancelBtn.click();
    await this.cancelBtn.waitFor({ state: 'hidden' });
  }

  async waitForDialog() {
    await this.dialogContent.waitFor({ state: 'visible' });
  }

  async getDialogText(): Promise<string> {
    return (await this.dialogContent.textContent()) || '';
  }
}

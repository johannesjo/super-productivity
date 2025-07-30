import { Page, Locator } from '@playwright/test';

export class WelcomeDialogComponent {
  private page: Page;
  readonly noThanksBtn: Locator;
  readonly letsGoBtn: Locator;
  readonly dialog: Locator;
  readonly dialogContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.noThanksBtn = page.locator('button:has-text("No thanks")');
    this.letsGoBtn = page.locator('button:has-text("Let\'s go!")');
    this.dialog = page.locator('mat-dialog-container');
    this.dialogContainer = page.locator('.cdk-overlay-container');
  }

  async dismissIfPresent() {
    try {
      // Wait a short time to see if dialog appears
      await this.dialog.waitFor({ state: 'visible', timeout: 3000 });

      // Try to click "No thanks" button if available
      if (await this.noThanksBtn.isVisible({ timeout: 1000 })) {
        await this.noThanksBtn.click();
      } else if (await this.letsGoBtn.isVisible({ timeout: 1000 })) {
        // Otherwise click "Let's go!" button
        await this.letsGoBtn.click();
      }

      // Wait for dialog to be hidden
      await this.dialog.waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      // Dialog not present or already dismissed, continue
    }
  }
}

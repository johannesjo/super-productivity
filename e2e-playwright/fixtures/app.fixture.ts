import { test as pagesTest } from './pages.fixture';
import { WelcomeDialogComponent } from '../components/welcome-dialog.component';

type AppFixtures = {
  loadAppAndDismissWelcome: void;
};

export const test = pagesTest.extend<AppFixtures>({
  loadAppAndDismissWelcome: [
    async ({ page }, use) => {
      await page.goto('/');

      // Wait for app to load
      await page.waitForTimeout(2000);

      // Check if there's a PIN screen and close it
      try {
        // Look for the X button in top-left corner of PIN screen
        const pinCloseBtn = page.locator('button').filter({ hasText: '✕' }).first();
        if (await pinCloseBtn.isVisible({ timeout: 1000 })) {
          await pinCloseBtn.click();
          await page.waitForTimeout(500);
        }
      } catch {
        // No PIN screen, continue
      }

      const welcomeDialog = new WelcomeDialogComponent(page);
      await welcomeDialog.dismissIfPresent();

      // Double-check that welcome dialog is dismissed
      try {
        const dialogCheck = page.locator(
          'mat-dialog-container:has-text("Welcome to Super Productivity")',
        );
        if (await dialogCheck.isVisible({ timeout: 1000 })) {
          console.log('Welcome dialog still visible, attempting to dismiss again');
          const anyButton = dialogCheck.locator('button').first();
          await anyButton.click();
          await dialogCheck.waitFor({ state: 'hidden', timeout: 2000 });
        }
      } catch {
        // Dialog is gone
      }

      // Wait for app to stabilize
      await page.waitForTimeout(1000);

      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';

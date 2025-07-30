import { test, expect } from '@playwright/test';

test.describe('Basic Load Test', () => {
  test('should load the app and dismiss welcome dialog', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for app to initialize
    await page.waitForTimeout(3000);

    // Debug: log all visible text
    const visibleText = await page.locator('body').textContent();
    console.log('Visible text:', visibleText?.substring(0, 200));

    // Check if welcome dialog is present
    const dialog = page.locator('mat-dialog-container');
    const isDialogVisible = await dialog.isVisible({ timeout: 2000 }).catch(() => false);

    if (isDialogVisible) {
      console.log('Welcome dialog is visible');

      // Try different button selectors
      const noThanksBtn = page.locator('button:has-text("No thanks")');
      const letsGoBtn = page.locator('button:has-text("Let\'s go!")');

      if (await noThanksBtn.isVisible({ timeout: 1000 })) {
        console.log('Clicking "No thanks" button');
        await noThanksBtn.click();
      } else if (await letsGoBtn.isVisible({ timeout: 1000 })) {
        console.log('Clicking "Let\'s go!" button');
        await letsGoBtn.click();
      } else {
        // Try to close dialog with any button
        const anyButton = dialog.locator('button').first();
        if (await anyButton.isVisible()) {
          console.log('Clicking first button in dialog');
          await anyButton.click();
        }
      }

      // Wait for dialog to close
      await dialog.waitFor({ state: 'hidden', timeout: 5000 });
    }

    // Verify the app has loaded by checking for key elements
    const sideNav = page.locator('side-nav');
    await expect(sideNav).toBeVisible({ timeout: 10000 });

    // Check for task list or main content area
    const mainContent = page.locator('.route-wrapper, main, [role="main"]').first();
    await expect(mainContent).toBeVisible();

    console.log('App loaded successfully');
  });
});

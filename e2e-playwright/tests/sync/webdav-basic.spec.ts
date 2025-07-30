import { test, expect } from '../../fixtures/app.fixture';

test.describe('WebDAV Sync', () => {
  test.skip('should configure WebDAV sync with Last-Modified support', async ({
    page,
    workViewPage,
  }) => {
    // Click sync button
    const syncBtn = page.locator('button.sync-btn');
    await syncBtn.click();

    // Wait for provider select and choose WebDAV
    const providerSelect = page.locator('formly-field-mat-select mat-select');
    await providerSelect.waitFor({ state: 'visible' });
    await page.waitForTimeout(100);
    await providerSelect.click();

    // Select WebDAV option
    const webdavOption = page.locator('#mat-option-3');
    await webdavOption.click();
    await page.waitForTimeout(100);

    // Fill in WebDAV configuration
    const baseUrlInput = page.locator('.e2e-baseUrl input');
    const userNameInput = page.locator('.e2e-userName input');
    const passwordInput = page.locator('.e2e-password input');
    const syncFolderInput = page.locator('.e2e-syncFolderPath input');

    await baseUrlInput.fill('http://localhost:2345/');
    await userNameInput.fill('alice');
    await passwordInput.fill('alice');
    await syncFolderInput.fill('/super-productivity-test');
    await page.waitForTimeout(100);

    // Save configuration
    const saveBtn = page.locator('mat-dialog-actions button[mat-stroked-button]');
    await saveBtn.click();

    // Create a test task
    await workViewPage.addTask('Test task for WebDAV Last-Modified sync');
    await page.waitForTimeout(500);

    // Trigger sync
    await syncBtn.waitFor({ state: 'visible', timeout: 3000 });
    await syncBtn.click();
    await page.waitForTimeout(1000);

    // Verify sync completed
    await page.waitForTimeout(3000);

    // Check that sync spinner is not present
    const syncSpinner = page.locator('.sync-btn mat-icon.spin');
    await expect(syncSpinner).not.toBeVisible();

    // Check for success icon
    const successIcon = page.locator('.sync-btn mat-icon:nth-of-type(2)');
    await expect(successIcon).toContainText('check');
  });
});

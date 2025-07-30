import { test, expect } from '../../fixtures/app.fixture';

test.describe('Issue Provider Panel', () => {
  test.skip('should open all dialogs without error', async ({ page }) => {
    // Click panel button
    const panelBtn = page.locator('.e2e-toggle-issue-provider-panel');
    await panelBtn.waitFor({ state: 'visible' });
    await panelBtn.click();

    // Wait for tab group
    const tabGroup = page.locator('mat-tab-group');
    await tabGroup.waitFor({ state: 'visible' });

    // Click on the last tab (add tab)
    const lastTab = page.locator('mat-tab-group .mat-mdc-tab:last-child');
    await lastTab.click();

    // Wait for issue provider setup overview
    const issueProviderOverview = page.locator('issue-provider-setup-overview');
    await issueProviderOverview.waitFor({ state: 'visible' });

    // Test all buttons in first item group
    const items1 = page.locator('.items:nth-of-type(1)');
    const items1Buttons = items1.locator('> button');
    const items1Count = await items1Buttons.count();

    for (let i = 0; i < Math.min(items1Count, 3); i++) {
      await items1Buttons.nth(i).click();
      const cancelBtn = page.locator('mat-dialog-actions button:nth-of-type(1)');
      await cancelBtn.waitFor({ state: 'visible' });
      await cancelBtn.click();
      await page.waitForTimeout(300); // Small delay between dialogs
    }

    // Test all buttons in second item group
    const items2 = page.locator('.items:nth-of-type(2)');
    const items2Buttons = items2.locator('> button');
    const items2Count = await items2Buttons.count();

    for (let i = 0; i < Math.min(items2Count, 7); i++) {
      await items2Buttons.nth(i).click();
      const cancelBtn = page.locator('mat-dialog-actions button:nth-of-type(1)');
      await cancelBtn.waitFor({ state: 'visible' });
      await cancelBtn.click();
      await page.waitForTimeout(300); // Small delay between dialogs
    }

    // Verify no error alerts
    const errorAlert = page.locator('.global-error-alert');
    await expect(errorAlert).not.toBeVisible();
  });
});

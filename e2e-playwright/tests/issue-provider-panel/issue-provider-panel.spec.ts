import { test } from '../../fixtures/test.fixture';

const PANEL_BTN = '.e2e-toggle-issue-provider-panel';
const ITEMS1 = '.items:first-child';
const ITEMS2 = '.items:nth-child(2)';

const CANCEL_BTN = 'mat-dialog-actions button:first-child';

test.describe('Issue Provider Panel', () => {
  test('should open all dialogs without error', async ({ page, workViewPage }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    await page.waitForSelector(PANEL_BTN, { state: 'visible' });
    await page.click(PANEL_BTN);
    await page.waitForSelector('mat-tab-group', { state: 'visible' });
    // Click on the last tab (add tab) which contains the issue-provider-setup-overview
    await page.click('mat-tab-group .mat-mdc-tab:last-child');
    await page.waitForSelector('issue-provider-setup-overview', { state: 'visible' });

    await page.locator(`${ITEMS1} > button`).nth(0).click();
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);
    await page.locator(`${ITEMS1} > button`).nth(1).click();
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);
    await page.locator(`${ITEMS1} > button`).nth(2).click();
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);

    await page.locator(`${ITEMS2} > button`).nth(0).click();
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);
    await page.locator(`${ITEMS2} > button`).nth(1).click();
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);
    await page.locator(`${ITEMS2} > button`).nth(2).click();
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);
    await page.locator(`${ITEMS2} > button`).nth(3).click();
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);
    await page.locator(`${ITEMS2} > button`).nth(4).click();
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);
    await page.locator(`${ITEMS2} > button`).nth(5).click();
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);
    await page.locator(`${ITEMS2} > button`).nth(6).click();
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);

    // No error check is implicit - test will fail if any error occurs
  });
});

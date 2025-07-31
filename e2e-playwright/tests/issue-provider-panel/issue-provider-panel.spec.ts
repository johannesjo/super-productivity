import { test } from '../../fixtures/test.fixture';

const PANEL_BTN = '.e2e-toggle-issue-provider-panel';
const ITEMS1 = '.items:nth-of-type(1)';
const ITEMS2 = '.items:nth-of-type(2)';

const CANCEL_BTN = 'mat-dialog-actions button:nth-of-type(1)';

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

    await page.click(`${ITEMS1} > button:nth-of-type(1)`);
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);
    await page.click(`${ITEMS1} > button:nth-of-type(2)`);
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);
    await page.click(`${ITEMS1} > button:nth-of-type(3)`);
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);

    await page.click(`${ITEMS2} > button:nth-of-type(1)`);
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);
    await page.click(`${ITEMS2} > button:nth-of-type(2)`);
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);
    await page.click(`${ITEMS2} > button:nth-of-type(3)`);
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);
    await page.click(`${ITEMS2} > button:nth-of-type(4)`);
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);
    await page.click(`${ITEMS2} > button:nth-of-type(5)`);
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);
    await page.click(`${ITEMS2} > button:nth-of-type(6)`);
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);
    await page.click(`${ITEMS2} > button:nth-of-type(7)`);
    await page.waitForSelector(CANCEL_BTN, { state: 'visible' });
    await page.click(CANCEL_BTN);

    // No error check is implicit - test will fail if any error occurs
  });
});

import {DailySummaryPage} from './daily-summary.po';
import {browser, logging} from 'protractor';

describe('work view', () => {
  let page: DailySummaryPage;

  beforeEach(async () => {
    page = new DailySummaryPage();
    browser.waitForAngularEnabled(false);
    await page.navigateTo();
  });

  afterEach(async () => {
    // Assert that there are no errors emitted from the browser
    const logs = await browser.manage().logs().get(logging.Type.BROWSER);
    expect(logs).not.toContain(jasmine.objectContaining({
      level: logging.Level.SEVERE,
    } as logging.Entry));
    await browser.restart();
  });

  it('should display take a moment to celebrate', async () => {
    const dh = await page.getDoneHeadline();
    expect(dh.getText()).toBe('Take a moment to celebrate!');
  });
});

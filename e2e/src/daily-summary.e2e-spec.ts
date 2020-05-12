import {DailySummaryPage} from './daily-summary.po';
import {browser, logging} from 'protractor';
import {AppHeader} from './header.po';

describe('work view', () => {
  let page: DailySummaryPage;
  let header: AppHeader;

  beforeEach(async () => {
    page = new DailySummaryPage();
    header = new AppHeader();
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

  it('should show any added task in table', async () => {
    await header.dynamicAddTask('XXX 1h/1h');
    const tr = await page.getTodaysTasks();
    expect(tr[1].getText()).toContain('XXX');
  });
});

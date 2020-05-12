import {browser, logging} from 'protractor';
import {WorklogPage} from './worklog.po';
import {AppHeader} from './header.po';

describe('work view', () => {
  let page: WorklogPage;
  let header: AppHeader;

  beforeEach(async () => {
    page = new WorklogPage();
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

  it('should load the page without errors', async () => {
    await header.dynamicAddTask('XXX 1h/1h');
  });
});

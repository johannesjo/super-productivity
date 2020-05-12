import {WorkViewPage} from './work-view.po';
import {browser, Key, logging} from 'protractor';

describe('work view', () => {
  let page: WorkViewPage;

  beforeEach(async () => {
    page = new WorkViewPage();
    browser.waitForAngularEnabled(false);
    await page.navigateTo();
  });

  afterEach(async () => {
    // Assert that there are no errors emitted from the browser
    const logs = await browser.manage().logs().get(logging.Type.BROWSER);
    expect(logs).not.toContain(jasmine.objectContaining({
      level: logging.Level.SEVERE,
    } as logging.Entry));
    // browser.executeScript('window.sessionStorage.clear();');
    // browser.executeScript('window.localStorage.clear();');
    await browser.restart();
  });

  it('should add a task', async () => {
    const at = await page.getAddTaskBar();
    await at.sendKeys('Some task');
    await at.sendKeys(Key.ENTER);

    const tasks = await page.getTasks();

    expect(tasks.length).toBe(1);
  });

  it('should add 2 tasks', async () => {
    const at = await page.getAddTaskBar();
    await at.sendKeys('Some task');
    await at.sendKeys(Key.ENTER);

    await at.sendKeys('Some other task');
    await at.sendKeys(Key.ENTER);

    const tasks = await page.getTasks();
    expect(tasks.length).toBe(2);
  });
});

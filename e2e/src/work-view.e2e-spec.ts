import {WorkViewPage} from './work-view.po';
import {browser, Key, logging} from 'protractor';
import {AppHeader} from './header.po';

describe('work view', () => {
  let page: WorkViewPage;
  let header: AppHeader;

  beforeEach(async () => {
    page = new WorkViewPage();
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

  it('should add multiple tasks from header button', async () => {
    await header.dynamicAddTask('1 XXX 1h/1h');
    await header.dynamicAddTask('2 XXX 1h/1h');
    await header.dynamicAddTask('3 XXX 1h/1h');
    const tasks = await page.getTasks();
    expect(tasks.length).toBe(3);
  });
});

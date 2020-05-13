import {$, $$, browser, by, element, ElementFinder, ExpectedConditions} from 'protractor';
import {promise as wdpromise} from 'selenium-webdriver';

export class WorkViewPage {
  navigateTo(): wdpromise.Promise<any> {
    return browser.get('/');
  }

  async getAddTaskBar(): Promise<ElementFinder> {
    const el = $('add-task-bar:not(.global) input');
    await browser.wait(ExpectedConditions.elementToBeClickable(el));
    return el;
  }

  async getTasks(): Promise<ElementFinder[]> {
    const tasks = $$('task');
    await browser.wait(ExpectedConditions.elementToBeClickable(tasks.get(0)));
    return tasks;
  }
}

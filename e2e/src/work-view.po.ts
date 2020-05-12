import {$, browser, by, element, ElementFinder, ExpectedConditions} from 'protractor';
import {ElementArrayFinder} from 'protractor/built/element';
import {promise as wdpromise} from 'selenium-webdriver';

export class WorkViewPage {
  navigateTo(): wdpromise.Promise<any> {
    return browser.get('/');
  }

  async getAddTaskBar(): Promise<ElementFinder> {
    await browser.wait(ExpectedConditions.elementToBeClickable($('input')));
    return element(by.css('input'));
  }

  async getTasks(): Promise<ElementFinder[]> {
    await browser.wait(ExpectedConditions.elementToBeClickable($('task')));
    return element.all(by.css('task'));
  }
}

import {$, browser, by, element, ElementFinder, ExpectedConditions} from 'protractor';
import {promise as wdpromise} from 'selenium-webdriver';

export class DailySummaryPage {
  navigateTo(): wdpromise.Promise<any> {
    return browser.get('/#/tag/TODAY/daily-summary');
    // return browser.get('https://app.super-productivity.com/#/tag/TODAY/daily-summary');
  }

  async dynamicAddTask(): Promise<any> {
  }

  async getDoneHeadline(): Promise<ElementFinder> {
    const elStr = '.done-headline';
    await browser.wait(ExpectedConditions.visibilityOf($(elStr)));
    return element(by.css(elStr));
  }

  async getDoneTasks(): Promise<ElementFinder[]> {
    const elStr = '.summary-table tr';
    await browser.wait(ExpectedConditions.elementToBeClickable($(elStr)));
    return element.all(by.css(elStr));
  }
}

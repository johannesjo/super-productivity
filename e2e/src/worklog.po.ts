import {$, browser, by, element, ElementFinder, ExpectedConditions} from 'protractor';
import {promise as wdpromise} from 'selenium-webdriver';

export class WorklogPage {
  navigateTo(): wdpromise.Promise<any> {
    return browser.get('/#/tag/TODAY/worklog');
  }



  async dynamicAddTask(): Promise<any> {

  }

  async getTotalTimeHeadline(): Promise<ElementFinder> {
    const elStr = '.total-time';
    await browser.wait(ExpectedConditions.visibilityOf($(elStr)));
    return element(by.css(elStr));
  }
}

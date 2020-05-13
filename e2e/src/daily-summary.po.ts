import {$, $$, browser, ElementFinder, ExpectedConditions} from 'protractor';
import {promise as wdpromise} from 'selenium-webdriver';

export class DailySummaryPage {
  navigateTo(): wdpromise.Promise<any> {
    return browser.get('/#/tag/TODAY/daily-summary');
    // return browser.get('https://app.super-productivity.com/#/tag/TODAY/daily-summary');
  }

  async getDoneHeadline(): Promise<ElementFinder> {
    const el = $('.done-headline');
    await browser.wait(ExpectedConditions.visibilityOf(el));
    return el;
  }

  async getTodaysTasks(): Promise<ElementFinder[]> {
    const trs = $$('.summary-table tr');
    await browser.wait(ExpectedConditions.elementToBeClickable(trs.get(0)));
    return trs;
  }
}

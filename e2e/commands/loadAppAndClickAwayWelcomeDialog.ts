import { NightwatchBrowser } from 'nightwatch';
import { BASE } from '../e2e.const';

export const WELCOME_BUTTON_SEL = '.welcome-ok-btn';

const BASE_URL = `${BASE}`;

module.exports = {
  async command(this: NightwatchBrowser, url: string = BASE_URL) {
    return this.url(url)
      .waitForElementVisible(WELCOME_BUTTON_SEL)
      .execute(() => localStorage.setItem('SUP_HAS_WELCOME_DIALOG_BEEN_SHOWN', 'true'))
      .sendKeys('body', this.Keys.ESCAPE)
      .pause(500)
      .sendKeys('body', this.Keys.ESCAPE)
      .pause(500)
      .sendKeys('body', this.Keys.ESCAPE)
      .pause(500)
      .sendKeys('body', this.Keys.ESCAPE);
  },
};

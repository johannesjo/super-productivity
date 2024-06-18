import { NightwatchBrowser } from 'nightwatch';
import { BASE } from '../e2e.const';

const BASE_URL = `${BASE}`;

module.exports = {
  async command(this: NightwatchBrowser, url: string = BASE_URL) {
    console.log(url);
    // return this.url(url).waitForElementVisible('mat-sidenav-container').url(url);
    return this.url(url);
  },
};

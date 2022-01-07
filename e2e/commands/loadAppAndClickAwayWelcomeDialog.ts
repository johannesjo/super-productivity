import { NightwatchBrowser } from 'nightwatch';
import { BASE } from '../e2e.const';

const BASE_URL = `${BASE}`;

module.exports = {
  async command(this: NightwatchBrowser, url: string = BASE_URL) {
    return this.url(url);
  },
};

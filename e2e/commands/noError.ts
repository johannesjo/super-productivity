import { NightwatchBrowser } from 'nightwatch';

module.exports = {
  async command(this: NightwatchBrowser, noteName: string) {
    return this.perform(() =>
      browser.getLog('browser', (logEntries) => {
        const errors = logEntries.filter((entry) => entry.level.name === 'SEVERE');
        browser.assert.equal(errors.length, 0, 'No console errors found');
      }),
    );
  },
};

import { NightwatchBrowser } from 'nightwatch';

module.exports = {
  async command(this: NightwatchBrowser) {
    return this.perform(function () {
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const browser = this;
      browser.getLog('browser', (logEntries: any[]) => {
        // Filter out expected/acceptable errors
        const errors = logEntries.filter((entry) => {
          if (entry.level.name !== 'SEVERE') return false;

          const message = entry.message || '';

          // Ignore common benign errors
          if (message.includes('Persistence not allowed')) return false;
          if (message.includes('favicon.ico')) return false;
          if (message.includes('ResizeObserver loop')) return false;
          if (message.includes('Non-Error promise rejection')) return false;

          return true;
        });

        if (errors.length > 0) {
          console.log('\nBROWSER CONSOLE ERRORS:');
          console.error(errors);
          console.log('\n');
        }
        browser.assert.equal(errors.length, 0, 'No critical console errors found');
      });
    });
  },
};

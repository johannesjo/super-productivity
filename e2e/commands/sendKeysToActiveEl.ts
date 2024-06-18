import { NightwatchBrowser } from 'nightwatch';

module.exports = {
  async command(this: NightwatchBrowser, keys: string | string[]) {
    return this.execute(
      () => document.activeElement,
      [],
      (result) => {
        const el = result.value as any;
        if (Array.isArray(keys)) {
          keys.forEach((key) => {
            this.pause(10).sendKeys(el, key).pause(10);
          });
          return this;
        }

        return this.pause(10).sendKeys(el, keys).pause(10);
      },
    );
  },
};

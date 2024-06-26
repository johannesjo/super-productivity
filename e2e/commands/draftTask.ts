import { NightwatchBrowser } from 'nightwatch';
import { cssSelectors } from '../e2e.const';

const { ADD_TASK_GLOBAL_SEL, ROUTER_WRAPPER } = cssSelectors;

module.exports = {
  async command(this: NightwatchBrowser, taskName: string) {
    return this.waitForElementVisible(ROUTER_WRAPPER)
      .setValue('body', 'A')
      .waitForElementVisible(ADD_TASK_GLOBAL_SEL)
      .setValue(ADD_TASK_GLOBAL_SEL, taskName);
  },
};

import { NightwatchAPI } from 'nightwatch';
import { cssSelectors } from '../e2e.const';

const { ADD_TASK_GLOBAL_SEL, ROUTER_WRAPPER } = cssSelectors;

module.exports = {
  async command(this: NightwatchAPI, taskName: string) {
    return this.waitForElementVisible(ROUTER_WRAPPER)
      .setValue('body', 'A')
      .waitForElementVisible(ADD_TASK_GLOBAL_SEL)
      .setValue(ADD_TASK_GLOBAL_SEL, taskName.slice(0, -1))
      .pause(200)
      .sendKeys(ADD_TASK_GLOBAL_SEL, taskName.slice(-1));
  },
};

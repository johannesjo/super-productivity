import { NBrowser } from '../n-browser-interface';

const SIDE_INNER = '.additional-info-panel';

// NOTE: needs to be executed from work view
module.exports = {
  async command(this: NBrowser, taskSel: string) {
    return this.waitForElementPresent(taskSel)
      .pause(50)
      .moveToElement(taskSel, 100, 15)
      .click(taskSel)
      .sendKeys(taskSel, this.Keys.ARROW_RIGHT)
      .waitForElementVisible(SIDE_INNER)
      .pause(50);
  },
};

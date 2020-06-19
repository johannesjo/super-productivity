import {NBrowser} from '../n-browser-interface';
import {Key} from 'protractor';

const SIDE_INNER = '.additional-info-panel';

// NOTE: needs to be executed from work view
module.exports = {
  async command(this: NBrowser, taskSel: string) {
    return this
      .waitForElementPresent(taskSel)
      .pause(50)
      .moveToElement(taskSel, 100, 15)
      .click(taskSel)
      .sendKeys(taskSel, Key.ARROW_RIGHT)
      .waitForElementVisible(SIDE_INNER)
      .pause(50)
      ;
  }
};

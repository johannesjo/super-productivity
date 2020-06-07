import {NBrowser} from '../n-browser-interface';

const HOVER_CTRLS = '.hover-controls';
const HOVER_BTNS = `${HOVER_CTRLS} button`;
const EXPAND_BTN = `${HOVER_BTNS}:last-of-type`;
const TASK_PANEL = '.additional-info-panel';

// NOTE: needs to be executed from work view
module.exports = {
  async command(this: NBrowser, taskSel: string) {
    return this
      .waitForElementVisible(taskSel)
      .moveToElement(taskSel, 100, 30)
      .waitForElementVisible(HOVER_BTNS)
      .waitForElementVisible(EXPAND_BTN)
      .click(EXPAND_BTN)
      .waitForElementVisible(TASK_PANEL)
      ;
  }
};

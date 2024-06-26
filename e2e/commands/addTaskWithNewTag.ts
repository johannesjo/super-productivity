import { NightwatchAPI } from 'nightwatch';
import { cssSelectors } from '../e2e.const';

const { ADD_TASK_GLOBAL_SEL, ROUTER_WRAPPER, TAGS } = cssSelectors;
const CONFIRMATION_DIALOG = 'dialog-confirm';
const TAG = `${TAGS} div.tag`;

module.exports = {
  async command(this: NightwatchAPI, tagTitle: string) {
    return this.waitForElementVisible(ROUTER_WRAPPER)
      .setValue('body', 'A')
      .waitForElementVisible(ADD_TASK_GLOBAL_SEL)
      .setValue(ADD_TASK_GLOBAL_SEL, `Test creating new tag #${tagTitle}`)
      .setValue(ADD_TASK_GLOBAL_SEL, this.Keys.ENTER)
      .waitForElementVisible(CONFIRMATION_DIALOG)
      .click('mat-dialog-actions button.mat-primary')
      .waitForElementVisible(TAG);
  },
};

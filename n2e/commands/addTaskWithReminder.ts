import {NBrowser} from '../n-browser-interface';


const TASK = 'task';
const SCHEDULE_TASK_ITEM = 'task-additional-info-item:nth-child(2)';
const DIALOG = 'mat-dialog-container';
const IN15CHIP = '.mat-standard-chip';
const DIALOG_SUBMIT = `${DIALOG} button[type=submit]`;

// NOTE: needs to be executed from work view
module.exports = {
  async command(this: NBrowser, taskName: string, taskSel = TASK) {
    return this
      .addTask(taskName)
      .openPanelForTask(taskSel)
      .waitForElementVisible(SCHEDULE_TASK_ITEM)
      .click(SCHEDULE_TASK_ITEM)
      .waitForElementVisible(DIALOG)
      .waitForElementVisible(IN15CHIP)
      .click(IN15CHIP)
      .click(DIALOG_SUBMIT)
      ;
  }
};


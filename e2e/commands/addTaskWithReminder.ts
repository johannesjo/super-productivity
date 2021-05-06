import { AddTaskWithReminderParams, NBrowser } from '../n-browser-interface';

const TASK = 'task';
const SCHEDULE_TASK_ITEM = 'task-additional-info-item:nth-child(2)';
const DIALOG = 'mat-dialog-container';
const DIALOG_SUBMIT = `${DIALOG} button[type=submit]:enabled`;

const TIME_INP_H = 'owl-date-time-timer-box:first-of-type input';
const TIME_INP_M = 'owl-date-time-timer-box:last-of-type input';

const M = 60 * 1000;

// being slightly longer than a minute prevents the edge case
// of the wrong minute if the rest before takes to long
const DEFAULT_DELTA = 1.2 * M;

// NOTE: needs to
// be executed from work view
module.exports = {
  async command(
    this: NBrowser,
    {
      title,
      taskSel = TASK,
      scheduleTime = Date.now() + DEFAULT_DELTA,
    }: AddTaskWithReminderParams,
  ) {
    const d = new Date(scheduleTime);
    const h = d.getHours();
    const m = d.getMinutes();

    return this.addTask(title)
      .openPanelForTask(taskSel)
      .waitForElementVisible(SCHEDULE_TASK_ITEM)
      .click(SCHEDULE_TASK_ITEM)
      .waitForElementVisible(DIALOG)
      .pause(30)
      .waitForElementVisible(TIME_INP_H)
      .pause(50)
      .setValue(TIME_INP_H, h.toString())
      .pause(50)
      .setValue(TIME_INP_H, this.Keys.ARROW_RIGHT)
      .pause(50)
      .setValue(TIME_INP_M, m.toString())
      .waitForElementVisible(DIALOG_SUBMIT)
      .click(DIALOG_SUBMIT)
      .waitForElementNotPresent(DIALOG);
  },
};

import { AddTaskWithReminderParams, NBrowser } from '../n-browser-interface';

const TASK = 'task';
const SCHEDULE_TASK_ITEM = 'task-additional-info-item:nth-child(2)';
const DIALOG = 'mat-dialog-container';
const DIALOG_SUBMIT = `${DIALOG} mat-dialog-actions button:last-of-type`;

const TIME_INP = 'input[type="time"]';

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

    return this.addTask(title)
      .openPanelForTask(taskSel)
      .waitForElementVisible(SCHEDULE_TASK_ITEM)
      .click(SCHEDULE_TASK_ITEM)
      .waitForElementVisible(DIALOG)
      .pause(30)
      .waitForElementVisible(TIME_INP)
      .pause(50)
      .setValue(TIME_INP, getClockString(d))
      .pause(50)
      .waitForElementVisible(DIALOG_SUBMIT)
      .click(DIALOG_SUBMIT)
      .waitForElementNotPresent(DIALOG);
  },
};

/*given a value of 8..5 returns '8:30'*/
const getClockString = (d: Date): string => {
  const h = d.getHours();
  const m = d.getMinutes();
  const parsed = Math.floor(h) + ':' + ('00' + m).slice(-2);
  return parsed.trim();
};

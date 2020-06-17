import {AddTaskWithReminderParams, NBrowser,} from '../n-browser-interface';
import {Key} from 'protractor';

const TASK = 'task';
const SCHEDULE_TASK_ITEM = 'task-additional-info-item:nth-child(2)';
const DIALOG = 'mat-dialog-container';
const INP = `${DIALOG} input[type=datetime-local]`;
const DIALOG_SUBMIT = `${DIALOG} button[type=submit]`;

const TODAY_BTN = '.owl-dt-schedule-item:first-of-type';
const TIME_INP_H = 'owl-date-time-timer-box:first-of-type input';
const TIME_INP_M = 'owl-date-time-timer-box:last-of-type input';

const M = 60 * 1000;


// NOTE: needs to
// be executed from work view
module.exports = {
  async command(this: NBrowser, {
    title,
    taskSel = TASK,
    scheduleTime = Date.now() + (60 * M)
  }: AddTaskWithReminderParams) {
    const d = new Date(scheduleTime);
    // const h = d.getHours();
    const m = d.getMinutes();

    return this
      .addTask(title)
      .openPanelForTask(taskSel)
      .waitForElementVisible(SCHEDULE_TASK_ITEM)
      .click(SCHEDULE_TASK_ITEM)
      .waitForElementVisible(DIALOG)
      .waitForElementVisible(TODAY_BTN)
      .setValue(TIME_INP_H, Key.ARROW_DOWN)
      .pause(500)
      .setValue(TIME_INP_H, Key.ARROW_RIGHT)
      .pause(500)
      .setValue(TIME_INP_M, m.toString())
      .pause(500)
      .setValue(TIME_INP_M, Key.ENTER)
      .setValue(TIME_INP_M, Key.ENTER)
      ;
  }
};


// const getDateScriptStr = (scheduleTime: number) => {
//   const dateStr = timestampToDatetimeInputString(scheduleTime);
//   return `
//     var dp = '${dateStr}';
//     document.querySelector('${INP}').value=dp;
//     `;
// };
//
// // copy from timestamp-to-datetime-input-string.ts because of compilation issue here
// function timestampToDatetimeInputString(timestamp: number): string {
//   const date = new Date((timestamp + _getTimeZoneOffsetInMs()));
//   return date.toISOString().slice(0, 19);
// }
//
// function _getTimeZoneOffsetInMs(): number {
//   return new Date().getTimezoneOffset() * -60 * 1000;
// }


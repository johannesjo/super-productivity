import { AddTaskWithReminderParams, NBrowser } from '../n-browser-interface';

const TASK = 'task';
const SCHEDULE_TASK_ITEM = 'task-detail-item:nth-child(2)';
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
    const timeValue = getTimeVal(d);

    return (
      this.addTask(title)
        .openPanelForTask(taskSel)
        .waitForElementVisible(SCHEDULE_TASK_ITEM)
        .click(SCHEDULE_TASK_ITEM)
        .waitForElementVisible(DIALOG)
        .pause(100)
        .waitForElementVisible(TIME_INP)
        .pause(150)
        .perform(() => {
          console.log(`Setting time input to: ${timeValue}`);
        })
        // Focus the input and ensure it's ready
        .click(TIME_INP)
        .pause(150)
        // Set the time value with extra reliability measures
        .clearValue(TIME_INP)
        .pause(100)
        // Use execute to directly set the value attribute as a fallback
        .execute(
          (selector: string, value: string) => {
            const el = document.querySelector(selector) as HTMLInputElement;
            if (el) {
              el.value = value;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          },
          [TIME_INP, timeValue],
        )
        .pause(200)
        // Also try setValue as backup
        .setValue(TIME_INP, timeValue)
        .pause(200)
        // Send Tab key to ensure value is committed and move focus
        .sendKeys(TIME_INP, '\uE004') // Tab key
        .pause(200)
        .waitForElementVisible(DIALOG_SUBMIT)
        .click(DIALOG_SUBMIT)
        .waitForElementNotPresent(DIALOG)
    );
  },
};

const getTimeVal = (d: Date): string => {
  // HTML time inputs always expect HH:MM format in 24-hour notation
  // regardless of locale settings
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const v = `${hours}:${minutes}`;

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log(
    `Enter time input value ${v}  – ${tz}; 12h: ${isBrowserLocaleClockType12h()}`,
  );
  return v;
};

const isBrowserLocaleClockType12h = (): boolean => {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const parts = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).formatToParts(
    new Date(),
  );
  return parts.some((part) => part.type === 'dayPeriod');
};

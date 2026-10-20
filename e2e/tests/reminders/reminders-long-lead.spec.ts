import { expect, test } from '../../fixtures/test.fixture';
import { cssSelectors } from '../../constants/selectors';
import { calendarNextMonthBtn } from '../../utils/element-helpers';
import { fillTimeInput } from '../../utils/time-input-helper';

const REMINDER_DIALOG = 'dialog-view-task-reminder';
const ONE_DAY_BEFORE = '1 day before it starts';
const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_MAX_WAIT_TIME = 150000;

test.describe('Task reminder lead times', () => {
  test('should keep a "1 day before" reminder and fire it a day ahead', async ({
    page,
    workViewPage,
    taskPage,
    testPrefix,
  }) => {
    test.setTimeout(REMINDER_MAX_WAIT_TIME + 60000);
    await workViewPage.waitForTaskList();

    const taskTitle = `${testPrefix}-day-ahead`;
    await workViewPage.addTask(taskTitle);
    const task = taskPage.getTaskByText(taskTitle).first();
    await expect(task).toBeVisible();

    // Due tomorrow, ~1.5 min after now (minute precision), so the reminder
    // one day earlier fires within the test.
    const due = new Date(Date.now() + DAY_MS + 90000);
    const scheduleDialog = page.locator(cssSelectors.DIALOG_SCHEDULE_TASK);

    await task.focus();
    await page.keyboard.press('s');
    await expect(scheduleDialog).toBeVisible({ timeout: 10000 });
    if (due.getMonth() !== new Date().getMonth()) {
      await calendarNextMonthBtn(scheduleDialog).click();
    }
    await scheduleDialog
      .locator('.mat-calendar-body-cell:not(.mat-calendar-body-disabled)')
      .filter({ hasText: new RegExp(`^\\s*${due.getDate()}\\s*$`) })
      .first()
      .click();
    await fillTimeInput(page, due);

    await scheduleDialog.locator('mat-select[name="type"]').click();
    await page.locator('mat-option').filter({ hasText: ONE_DAY_BEFORE }).click();
    await scheduleDialog.locator('[data-test-id="schedule-submit-btn"]').click();
    await expect(scheduleDialog).toBeHidden({ timeout: 10000 });

    // Reopening reads the lead time back instead of collapsing it to 1 hour
    await task.focus();
    await page.keyboard.press('s');
    await expect(scheduleDialog).toBeVisible({ timeout: 10000 });
    await expect(scheduleDialog.locator('mat-select[name="type"]')).toContainText(
      ONE_DAY_BEFORE,
    );
    await page.keyboard.press('Escape');
    await expect(scheduleDialog).toBeHidden({ timeout: 10000 });

    const reminderDialog = page.locator(REMINDER_DIALOG);
    await expect(reminderDialog).toBeVisible({ timeout: REMINDER_MAX_WAIT_TIME });
    await expect(reminderDialog.locator('.task').first()).toContainText(taskTitle);
  });
});

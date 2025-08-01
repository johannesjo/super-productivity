import { expect, test } from '../../fixtures/test.fixture';

const DIALOG = 'dialog-view-task-reminder';
const DIALOG_TASK = `${DIALOG} .task`;
const DIALOG_TASK1 = `${DIALOG_TASK}:first-of-type`;

const SCHEDULE_MAX_WAIT_TIME = 180000;

// Helper selectors from addTaskWithReminder
const TASK = 'task';
const SCHEDULE_TASK_ITEM = 'task-detail-item:nth-child(2)';
const DIALOG_CONTAINER = 'mat-dialog-container';
const DIALOG_SUBMIT = `${DIALOG_CONTAINER} mat-dialog-actions button:last-of-type`;
const TIME_INP = 'input[type="time"]';

const getTimeVal = (d: Date): string => {
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

test.describe('Reminders View Task', () => {
  test('should display a modal with a scheduled task if due', async ({
    page,
    workViewPage,
    testPrefix,
  }) => {
    test.setTimeout(SCHEDULE_MAX_WAIT_TIME + 30000); // Add extra time for test setup

    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    const taskTitle = `${testPrefix}-0 A task`;
    const scheduleTime = Date.now() + 10000; // Add 10 seconds buffer
    const d = new Date(scheduleTime);
    const timeValue = getTimeVal(d);

    // Add task
    await workViewPage.addTask(taskTitle);

    // Open panel for task
    const taskEl = page.locator(TASK).first();
    await taskEl.hover();
    const detailPanelBtn = page.locator('.show-additional-info-btn').first();
    await detailPanelBtn.waitFor({ state: 'visible' });
    await detailPanelBtn.click();

    // Wait for and click schedule task item
    await page.waitForSelector(SCHEDULE_TASK_ITEM, { state: 'visible' });
    await page.click(SCHEDULE_TASK_ITEM);

    // Wait for dialog
    await page.waitForSelector(DIALOG_CONTAINER, { state: 'visible' });
    await page.waitForTimeout(100);

    // Set time
    await page.waitForSelector(TIME_INP, { state: 'visible' });
    await page.waitForTimeout(150);

    // Focus and set time value
    await page.click(TIME_INP);
    await page.waitForTimeout(150);

    // Clear and set value
    await page.fill(TIME_INP, '');
    await page.waitForTimeout(100);

    // Set the time value
    await page.evaluate(
      ({ selector, value }) => {
        const el = document.querySelector(selector) as HTMLInputElement;
        if (el) {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
      { selector: TIME_INP, value: timeValue },
    );

    await page.waitForTimeout(200);

    // Also set value normally
    await page.fill(TIME_INP, timeValue);
    await page.waitForTimeout(200);

    // Tab to commit value
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // Submit dialog
    await page.waitForSelector(DIALOG_SUBMIT, { state: 'visible' });
    await page.click(DIALOG_SUBMIT);
    await page.waitForSelector(DIALOG_CONTAINER, { state: 'hidden' });

    // Wait for reminder dialog to appear
    await page.waitForSelector(DIALOG, {
      state: 'visible',
      timeout: SCHEDULE_MAX_WAIT_TIME,
    });

    // Assert dialog and task are present
    await expect(page.locator(DIALOG)).toBeVisible();
    await page.waitForSelector(DIALOG_TASK1, { state: 'visible' });
    await expect(page.locator(DIALOG_TASK1)).toBeVisible();
    await expect(page.locator(DIALOG_TASK1)).toContainText(taskTitle);
  });
});

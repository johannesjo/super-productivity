import { expect, test } from '../../fixtures/test.fixture';

const DIALOG = 'dialog-view-task-reminder';
const DIALOG_TASK = `${DIALOG} .task`;
const DIALOG_TASK1 = `${DIALOG_TASK}:first-of-type`;

const SCHEDULE_MAX_WAIT_TIME = 60000; // Reduced from 180s to 60s

// Helper selectors from addTaskWithReminder
const TASK = 'task';
const SCHEDULE_TASK_ITEM =
  'task-detail-item:has(mat-icon:text("alarm")), task-detail-item:has(mat-icon:text("today")), task-detail-item:has(mat-icon:text("schedule"))';
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
    test.setTimeout(SCHEDULE_MAX_WAIT_TIME + 20000); // Add extra time for test setup

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

    // Wait for and click schedule task item with better error handling
    const scheduleItem = page.locator(SCHEDULE_TASK_ITEM);
    await scheduleItem.waitFor({ state: 'visible', timeout: 5000 });
    await scheduleItem.click();

    // Wait for dialog with improved timeout
    const dialogContainer = page.locator(DIALOG_CONTAINER);
    await dialogContainer.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(200); // Allow dialog animation to complete

    // Set time - use more robust selector and approach
    const timeInput = page
      .locator('mat-form-field input[type="time"]')
      .or(page.locator(TIME_INP));
    await timeInput.waitFor({ state: 'visible', timeout: 10000 });

    // Multiple approaches to ensure the time input is ready
    await timeInput.click();
    await page.waitForTimeout(100);

    // Clear existing value if any
    await timeInput.fill('');
    await page.waitForTimeout(100);

    // Set the time value
    await timeInput.fill(timeValue);
    await page.waitForTimeout(100);

    // Verify the value was set
    const inputValue = await timeInput.inputValue();
    if (inputValue !== timeValue) {
      // Fallback: use evaluate to set value directly
      await page.evaluate(
        ({ value }) => {
          const timeInputEl = document.querySelector(
            'mat-form-field input[type="time"]',
          ) as HTMLInputElement;
          if (timeInputEl) {
            timeInputEl.value = value;
            timeInputEl.dispatchEvent(new Event('input', { bubbles: true }));
            timeInputEl.dispatchEvent(new Event('change', { bubbles: true }));
          }
        },
        { value: timeValue },
      );
    }

    // Ensure focus moves away to commit the value
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

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

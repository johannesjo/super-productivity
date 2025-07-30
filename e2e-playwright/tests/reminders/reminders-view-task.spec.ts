import { test, expect } from '../../fixtures/app.fixture';
import { AppHelpers } from '../../helpers/app-helpers';

const DIALOG = 'dialog-view-task-reminder';
const DIALOG_TASK = `${DIALOG} .task`;
const DIALOG_TASK1 = `${DIALOG_TASK}:first-of-type`;

const SCHEDULE_MAX_WAIT_TIME = 180000;

const getTimeValue = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

test.describe('Task Reminders', () => {
  test.skip('should display a modal with a scheduled task if due', async ({
    page,
    workViewPage,
  }) => {
    // Add task first
    const taskTitle = '0 A task';
    await workViewPage.addTask(taskTitle);

    // Wait for task to appear
    const task = page.locator('task').first();
    await task.waitFor({ state: 'visible', timeout: 5000 });

    // Open task detail panel
    await AppHelpers.openTaskDetailPanel(page, task);

    // Click on schedule/reminder item - try different selectors
    const scheduleItem = page
      .locator(
        'task-detail-item:nth-child(2), button:has-text("Schedule"), button:has-text("Reminder"), [aria-label*="reminder"], [aria-label*="schedule"]',
      )
      .first();
    await scheduleItem.waitFor({ state: 'visible', timeout: 5000 });
    await scheduleItem.click();

    // Wait for dialog
    const dialog = page.locator('mat-dialog-container');
    await dialog.waitFor({ state: 'visible' });

    // Set reminder time (current time + buffer)
    const reminderTime = new Date(Date.now() + 10000); // 10 seconds in future
    const timeValue = getTimeValue(reminderTime);

    const timeInput = page.locator('input[type="time"]');
    await timeInput.waitFor({ state: 'visible' });

    // Set time value using multiple methods for reliability
    await timeInput.click();
    await page.waitForTimeout(150);

    // Clear and set value
    await timeInput.clear();
    await page.waitForTimeout(100);

    // Use evaluate to directly set the value
    await timeInput.evaluate((el: HTMLInputElement, value: string) => {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, timeValue);

    await page.waitForTimeout(200);

    // Also use fill as backup
    await timeInput.fill(timeValue);
    await page.waitForTimeout(200);

    // Tab to commit value
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // Submit dialog
    const submitBtn = page.locator(
      'mat-dialog-container mat-dialog-actions button:last-of-type',
    );
    await submitBtn.click();

    // Wait for dialog to close
    await dialog.waitFor({ state: 'hidden' });

    // Wait for reminder dialog to appear
    const reminderDialog = page.locator(DIALOG);
    await reminderDialog.waitFor({ state: 'visible', timeout: SCHEDULE_MAX_WAIT_TIME });

    // Verify task is displayed in reminder dialog
    const dialogTask = page.locator(DIALOG_TASK1);
    await expect(dialogTask).toBeVisible();
    await expect(dialogTask).toContainText(taskTitle);
  });
});

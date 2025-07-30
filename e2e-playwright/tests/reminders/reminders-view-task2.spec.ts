import { test, expect } from '../../fixtures/app.fixture';
import { AppHelpers } from '../../helpers/app-helpers';

const SCHEDULE_MAX_WAIT_TIME = 180000;

const getTimeValue = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

test.describe('Multiple Task Reminders', () => {
  const addTaskWithReminder = async (
    page: any,
    workViewPage: any,
    title: string,
    scheduleTime?: number,
  ): Promise<void> => {
    // Add task
    await workViewPage.addTask(title);

    // Get the most recent task
    const tasks = page.locator('task');
    const taskCount = await tasks.count();
    const task = tasks.nth(taskCount - 1);

    // Open task detail panel
    await AppHelpers.openTaskDetailPanel(page, task);

    // Click schedule item
    const scheduleItem = page.locator('task-detail-item:nth-child(2)');
    await scheduleItem.waitFor({ state: 'visible' });
    await scheduleItem.click();

    // Wait for dialog
    const dialog = page.locator('mat-dialog-container');
    await dialog.waitFor({ state: 'visible' });
    await page.waitForTimeout(100);

    // Set reminder time
    const reminderTime = new Date(scheduleTime || Date.now() + 72000); // Default 1.2 minutes
    const timeValue = getTimeValue(reminderTime);

    const timeInput = page.locator('input[type="time"]');
    await timeInput.waitFor({ state: 'visible' });
    await page.waitForTimeout(150);

    // Set time
    await timeInput.click();
    await page.waitForTimeout(150);
    await timeInput.clear();
    await page.waitForTimeout(100);

    await timeInput.evaluate((el: HTMLInputElement, value: string) => {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, timeValue);

    await page.waitForTimeout(200);
    await timeInput.fill(timeValue);
    await page.waitForTimeout(200);

    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // Submit dialog
    const submitBtn = page.locator(
      'mat-dialog-container mat-dialog-actions button:last-of-type',
    );
    await submitBtn.click();

    // Wait for dialog to close
    await dialog.waitFor({ state: 'hidden' });
  };

  test.skip('should display a modal with 2 scheduled tasks if due', async ({
    page,
    workViewPage,
  }) => {
    // Add two tasks with reminders
    await addTaskWithReminder(page, workViewPage, '0 B task');
    await addTaskWithReminder(page, workViewPage, '1 B task', Date.now() + 10000);

    // Wait for reminder dialog to appear
    const reminderDialog = page.locator('dialog-view-task-reminder');
    await reminderDialog.waitFor({ state: 'visible', timeout: SCHEDULE_MAX_WAIT_TIME });

    // Verify dialog is present
    await expect(reminderDialog).toBeVisible();

    // Wait for both tasks to be visible
    const dialogTask1 = page.locator('dialog-view-task-reminder .task:first-of-type');
    const dialogTask2 = page.locator('dialog-view-task-reminder .task:nth-of-type(2)');

    await dialogTask1.waitFor({ state: 'visible', timeout: SCHEDULE_MAX_WAIT_TIME });
    await dialogTask2.waitFor({ state: 'visible', timeout: SCHEDULE_MAX_WAIT_TIME });

    // Verify both tasks are displayed
    const tasksWrapper = page.locator('dialog-view-task-reminder .tasks');
    await expect(tasksWrapper).toContainText('0 B task');
    await expect(tasksWrapper).toContainText('1 B task');
  });
});

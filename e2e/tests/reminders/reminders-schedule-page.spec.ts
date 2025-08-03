import { test, expect } from '../../fixtures/test.fixture';

const TASK = 'task';
const TASK_SCHEDULE_BTN = '.ico-btn.schedule-btn';
const SCHEDULE_DIALOG = 'dialog-schedule-task';
const SCHEDULE_DIALOG_TIME_INPUT = 'dialog-schedule-task input[type="time"]';
const SCHEDULE_DIALOG_CONFIRM = 'mat-dialog-actions button:last-child';

const SCHEDULE_ROUTE_BTN = 'button[routerlink="scheduled-list"]';
const SCHEDULE_PAGE_CMP = 'scheduled-list-page';
const SCHEDULE_PAGE_TASKS = `${SCHEDULE_PAGE_CMP} .tasks planner-task`;
const SCHEDULE_PAGE_TASK_1 = `${SCHEDULE_PAGE_TASKS}:first-of-type`;
const SCHEDULE_PAGE_TASK_1_TITLE_EL = `${SCHEDULE_PAGE_TASK_1} .title`;

test.describe('Reminders Schedule Page', () => {
  test('should add a scheduled tasks', async ({ page, workViewPage, testPrefix }) => {
    await workViewPage.waitForTaskList();

    // Add task with reminder
    const title = `${testPrefix}-scheduled-task`;
    const scheduleTime = Date.now() + 60000; // Add 1 minute buffer for CI

    // Add task
    await workViewPage.addTask(title);

    // Wait for task to be fully rendered
    const targetTask = page.locator(TASK).filter({ hasText: title }).first();
    await targetTask.waitFor({ state: 'visible' });

    // Hover to reveal schedule button
    await targetTask.hover();

    // Wait for schedule button to become visible after hover
    const scheduleBtn = targetTask.locator(TASK_SCHEDULE_BTN);
    await scheduleBtn.waitFor({ state: 'visible' });
    await scheduleBtn.click();

    // Wait for schedule dialog to appear
    const dialog = page.locator(SCHEDULE_DIALOG);
    await dialog.waitFor({ state: 'visible' });

    // Wait for time input to be ready
    const timeInput = page.locator(SCHEDULE_DIALOG_TIME_INPUT);
    await timeInput.waitFor({ state: 'visible' });

    // Set time (convert timestamp to time string)
    const date = new Date(scheduleTime);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    await timeInput.fill(`${hours}:${minutes}`);

    // Confirm scheduling
    const confirmBtn = page.locator(SCHEDULE_DIALOG_CONFIRM);
    await confirmBtn.click();

    // Wait for dialog to close
    await dialog.waitFor({ state: 'hidden' });

    // Wait for schedule indicator to appear on the task
    await targetTask.locator(TASK_SCHEDULE_BTN).waitFor({ state: 'visible' });

    // Navigate to scheduled page
    const scheduleRouteBtn = page.locator(SCHEDULE_ROUTE_BTN);
    await scheduleRouteBtn.click();

    // Wait for scheduled page to load
    await page.waitForSelector(SCHEDULE_PAGE_CMP, { state: 'visible' });

    // Verify task appears in scheduled list
    await page.waitForSelector(SCHEDULE_PAGE_TASK_1, { state: 'visible' });
    await expect(page.locator(SCHEDULE_PAGE_TASK_1_TITLE_EL)).toContainText(title);
  });

  test('should add multiple scheduled tasks', async ({
    page,
    workViewPage,
    testPrefix,
  }) => {
    await workViewPage.waitForTaskList();

    // Helper function to schedule a task
    const scheduleTask = async (
      taskTitle: string,
      scheduleTime: number,
    ): Promise<void> => {
      // Find the specific task
      const task = page.locator(TASK).filter({ hasText: taskTitle }).first();
      await task.waitFor({ state: 'visible' });

      // Hover to reveal schedule button
      await task.hover();

      // Wait for and click schedule button
      const scheduleBtn = task.locator(TASK_SCHEDULE_BTN);
      await scheduleBtn.waitFor({ state: 'visible' });
      await scheduleBtn.click();

      // Wait for dialog
      const dialog = page.locator(SCHEDULE_DIALOG);
      await dialog.waitFor({ state: 'visible' });

      // Wait for and fill time input
      const timeInput = page.locator(SCHEDULE_DIALOG_TIME_INPUT);
      await timeInput.waitFor({ state: 'visible' });

      // Set time
      const date = new Date(scheduleTime);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      await timeInput.fill(`${hours}:${minutes}`);

      // Confirm
      const confirmBtn = page.locator(SCHEDULE_DIALOG_CONFIRM);
      await confirmBtn.click();

      // Wait for dialog to close
      await dialog.waitFor({ state: 'hidden' });

      // Wait for schedule indicator to appear
      await task.locator(TASK_SCHEDULE_BTN).waitFor({ state: 'visible' });
    };

    // Add and schedule first task
    const title1 = `${testPrefix}-task-1`;
    const scheduleTime1 = Date.now() + 60000; // 1 minute from now

    await workViewPage.addTask(title1);

    // Wait for first task to be visible
    await page.locator(TASK).filter({ hasText: title1 }).waitFor({ state: 'visible' });

    await scheduleTask(title1, scheduleTime1);

    // Add and schedule second task
    const title2 = `${testPrefix}-task-2`;
    const scheduleTime2 = Date.now() + 120000; // 2 minutes from now

    await workViewPage.addTask(title2);

    // Wait for second task to be visible
    await page.locator(TASK).filter({ hasText: title2 }).waitFor({ state: 'visible' });

    await scheduleTask(title2, scheduleTime2);

    // Verify both tasks have schedule indicators
    // Use first() to avoid multiple element issues if there are duplicates
    const task1 = page.locator(TASK).filter({ hasText: title1 }).first();
    const task2 = page.locator(TASK).filter({ hasText: title2 }).first();

    await expect(task1.locator(TASK_SCHEDULE_BTN).first()).toBeVisible();
    await expect(task2.locator(TASK_SCHEDULE_BTN).first()).toBeVisible();

    // Navigate to scheduled page
    const scheduleRouteBtn = page.locator(SCHEDULE_ROUTE_BTN);
    await scheduleRouteBtn.click();

    // Wait for scheduled page to load
    await page.waitForSelector(SCHEDULE_PAGE_CMP, { state: 'visible' });

    // Verify both tasks appear in scheduled list
    const scheduledTasks = page.locator(SCHEDULE_PAGE_TASKS);
    await expect(scheduledTasks).toHaveCount(2);

    // Check that both titles are present somewhere in the scheduled list
    const allTaskTitles = page.locator(`${SCHEDULE_PAGE_TASKS} .title`);
    await expect(allTaskTitles).toContainText([title1]);
    await expect(allTaskTitles).toContainText([title2]);
  });
});

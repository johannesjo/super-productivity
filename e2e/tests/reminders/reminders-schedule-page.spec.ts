import { test, expect } from '../../fixtures/test.fixture';

const TASK = 'task';
const TASK_SCHEDULE_BTN = '.ico-btn.schedule-btn';

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
    await page.waitForSelector(TASK, { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500); // Let Angular settle

    // Find the task with our title
    const targetTask = page.locator(TASK).filter({ hasText: title }).first();
    await expect(targetTask).toBeVisible({ timeout: 5000 });

    // Hover and click schedule button
    await targetTask.hover();
    await page.waitForTimeout(200); // Wait for hover effects

    const scheduleBtn = targetTask.locator(TASK_SCHEDULE_BTN);
    await scheduleBtn.waitFor({ state: 'visible', timeout: 5000 });
    await scheduleBtn.click();

    // Wait for and handle schedule dialog
    const dialog = page.locator('dialog-schedule-task');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500); // Let dialog fully render

    // Set time (convert timestamp to time string)
    const date = new Date(scheduleTime);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const timeInput = page.locator('input[type="time"]');
    await timeInput.waitFor({ state: 'visible', timeout: 5000 });
    await timeInput.fill(`${hours}:${minutes}`);

    // Confirm scheduling
    const confirmBtn = page.locator('mat-dialog-actions button').last();
    await confirmBtn.click();

    // Wait for dialog to close
    await dialog.waitFor({ state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(500); // Let UI update

    // Verify schedule indicator is present on the task
    await expect(targetTask.locator(TASK_SCHEDULE_BTN)).toBeVisible({ timeout: 5000 });

    // Navigate to scheduled page
    const scheduleRouteBtn = page.locator(SCHEDULE_ROUTE_BTN);
    await scheduleRouteBtn.waitFor({ state: 'visible', timeout: 5000 });
    await scheduleRouteBtn.click();

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');
    await expect(page.locator(SCHEDULE_PAGE_CMP)).toBeVisible({ timeout: 10000 });

    // Verify task appears in scheduled list
    await expect(page.locator(SCHEDULE_PAGE_TASK_1)).toBeVisible({ timeout: 5000 });
    await expect(page.locator(SCHEDULE_PAGE_TASK_1_TITLE_EL)).toContainText(title, {
      timeout: 5000,
    });
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
      await expect(task).toBeVisible({ timeout: 5000 });

      // Hover and click schedule button
      await task.hover();
      await page.waitForTimeout(200);

      const scheduleBtn = task.locator(TASK_SCHEDULE_BTN);
      await scheduleBtn.waitFor({ state: 'visible', timeout: 5000 });
      await scheduleBtn.click();

      // Handle dialog
      const dialog = page.locator('dialog-schedule-task');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);

      // Set time
      const date = new Date(scheduleTime);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const timeInput = page.locator('input[type="time"]');
      await timeInput.waitFor({ state: 'visible', timeout: 5000 });
      await timeInput.fill(`${hours}:${minutes}`);

      // Confirm
      const confirmBtn = page.locator('mat-dialog-actions button').last();
      await confirmBtn.click();
      await dialog.waitFor({ state: 'hidden', timeout: 5000 });
      await page.waitForTimeout(500);
    };

    // Add and schedule first task
    const title1 = `${testPrefix}-task-1`;
    const scheduleTime1 = Date.now() + 60000; // 1 minute from now

    await workViewPage.addTask(title1);
    await page.waitForSelector(TASK, { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);

    await scheduleTask(title1, scheduleTime1);

    // Add and schedule second task
    const title2 = `${testPrefix}-task-2`;
    const scheduleTime2 = Date.now() + 120000; // 2 minutes from now

    await workViewPage.addTask(title2);

    // Wait for both tasks to be present
    await page.waitForFunction(() => document.querySelectorAll('task').length >= 2, {
      timeout: 5000,
    });
    await page.waitForTimeout(500);

    await scheduleTask(title2, scheduleTime2);

    // Verify both tasks have schedule indicators
    const task1 = page.locator(TASK).filter({ hasText: title1 });
    const task2 = page.locator(TASK).filter({ hasText: title2 });

    await expect(task1.locator(TASK_SCHEDULE_BTN)).toBeVisible({ timeout: 5000 });
    await expect(task2.locator(TASK_SCHEDULE_BTN)).toBeVisible({ timeout: 5000 });

    // Navigate to scheduled page
    const scheduleRouteBtn = page.locator(SCHEDULE_ROUTE_BTN);
    await scheduleRouteBtn.waitFor({ state: 'visible', timeout: 5000 });
    await scheduleRouteBtn.click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');
    await expect(page.locator(SCHEDULE_PAGE_CMP)).toBeVisible({ timeout: 10000 });

    // Verify both tasks appear in scheduled list
    // Note: The order might vary, so we check for presence rather than specific positions
    const scheduledTasks = page.locator(SCHEDULE_PAGE_TASKS);
    await expect(scheduledTasks).toHaveCount(2, { timeout: 5000 });

    // Check that both titles are present somewhere in the scheduled list
    const allTaskTitles = page.locator(`${SCHEDULE_PAGE_TASKS} .title`);
    await expect(allTaskTitles).toContainText([title1], { timeout: 5000 });
    await expect(allTaskTitles).toContainText([title2], { timeout: 5000 });
  });
});

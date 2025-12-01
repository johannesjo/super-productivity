import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../fixtures/test.fixture';

const TASK = 'task';
const TASK_SCHEDULE_BTN = '.ico-btn.schedule-btn';
const SCHEDULE_DIALOG = 'dialog-schedule-task';
const SCHEDULE_DIALOG_TIME_INPUT = 'dialog-schedule-task input[type="time"]';
const SCHEDULE_DIALOG_CONFIRM = 'mat-dialog-actions button:last-child';

const SCHEDULE_ROUTE_BTN = 'magic-side-nav a[href="#/scheduled-list"]';
const SCHEDULE_PAGE_CMP = 'scheduled-list-page';
const SCHEDULE_PAGE_TASKS = `${SCHEDULE_PAGE_CMP} .tasks planner-task`;
const SCHEDULE_PAGE_TASK_1 = `${SCHEDULE_PAGE_TASKS}:first-of-type`;
const SCHEDULE_PAGE_TASK_1_TITLE_EL = `${SCHEDULE_PAGE_TASK_1} .title`;
const DETAIL_PANEL_BTN = '.show-additional-info-btn';
const DETAIL_PANEL_SELECTOR = 'dialog-task-detail-panel, task-detail-panel';
const DETAIL_PANEL_SCHEDULE_ITEM =
  'task-detail-item:has(mat-icon:text("alarm")), ' +
  'task-detail-item:has(mat-icon:text("today")), ' +
  'task-detail-item:has(mat-icon:text("schedule"))';

const fillScheduleDialogTime = async (
  page: Page,
  scheduleTime: number,
): Promise<void> => {
  const dialog = page.locator(SCHEDULE_DIALOG);
  await dialog.waitFor({ state: 'visible', timeout: 10000 });

  const timeInput = page.locator(SCHEDULE_DIALOG_TIME_INPUT);
  await timeInput.waitFor({ state: 'visible', timeout: 10000 });

  const date = new Date(scheduleTime);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  await timeInput.fill('');
  await timeInput.fill(`${hours}:${minutes}`);

  const confirmBtn = page.locator(SCHEDULE_DIALOG_CONFIRM);
  await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
  await confirmBtn.click();

  await dialog.waitFor({ state: 'hidden', timeout: 10000 });
};

const closeDetailPanelIfOpen = async (page: Page): Promise<void> => {
  const detailPanel = page.locator(DETAIL_PANEL_SELECTOR).first();
  if (await detailPanel.isVisible()) {
    await page.keyboard.press('Escape');
    await detailPanel.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
};

const scheduleTaskViaDetailPanel = async (
  page: Page,
  task: Locator,
  scheduleTime: number,
): Promise<void> => {
  await task.waitFor({ state: 'visible' });
  await task.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await task.hover({ force: true });

  const detailBtn = task.locator(DETAIL_PANEL_BTN).first();
  await detailBtn.waitFor({ state: 'visible', timeout: 5000 });
  await detailBtn.click();

  const scheduleItem = page.locator(DETAIL_PANEL_SCHEDULE_ITEM).first();
  await scheduleItem.waitFor({ state: 'visible', timeout: 5000 });
  await scheduleItem.click();

  await fillScheduleDialogTime(page, scheduleTime);
  await closeDetailPanelIfOpen(page);
};

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

    // Open detail panel to access schedule action
    await scheduleTaskViaDetailPanel(page, targetTask, scheduleTime);

    // Wait for schedule indicator to appear on the task
    await targetTask
      .locator(TASK_SCHEDULE_BTN)
      .waitFor({ state: 'visible', timeout: 10000 });

    // Navigate to scheduled page
    try {
      const scheduleRouteBtn = page.locator(SCHEDULE_ROUTE_BTN);
      await scheduleRouteBtn.waitFor({ state: 'visible', timeout: 5000 });
      await scheduleRouteBtn.first().click();
    } catch (error) {
      console.log('Nav button failed, using direct navigation');
      await page.goto('/#/scheduled-list');
    }

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
    test.setTimeout(90000); // Increase timeout for multiple operations
    await workViewPage.waitForTaskList();

    // Wait a bit for the page to stabilize
    await page.waitForTimeout(1000);

    // Helper function to schedule a task
    const scheduleTask = async (
      taskTitle: string,
      scheduleTime: number,
    ): Promise<void> => {
      // Find the specific task
      const task = page.locator(TASK).filter({ hasText: taskTitle }).first();
      await task.waitFor({ state: 'visible' });

      await scheduleTaskViaDetailPanel(page, task, scheduleTime);

      await task
        .locator(TASK_SCHEDULE_BTN)
        .first()
        .waitFor({ state: 'visible', timeout: 10000 });
    };

    // Add and schedule first task
    const title1 = `${testPrefix}-task-1`;
    const scheduleTime1 = Date.now() + 60000; // 1 minute from now

    await workViewPage.addTask(title1);

    // Wait for first task to be visible and stable
    await page
      .locator(TASK)
      .filter({ hasText: title1 })
      .first()
      .waitFor({ state: 'visible' });
    await page.waitForTimeout(500); // Let the task fully render

    await scheduleTask(title1, scheduleTime1);

    // Add and schedule second task
    const title2 = `${testPrefix}-task-2`;
    const scheduleTime2 = Date.now() + 120000; // 2 minutes from now

    await workViewPage.addTask(title2);

    // Wait for second task to be visible and stable
    await page
      .locator(TASK)
      .filter({ hasText: title2 })
      .first()
      .waitFor({ state: 'visible' });
    await page.waitForTimeout(500); // Let the task fully render

    await scheduleTask(title2, scheduleTime2);

    // Verify both tasks have schedule indicators
    // Use first() to avoid multiple element issues if there are duplicates
    const task1 = page.locator(TASK).filter({ hasText: title1 }).first();
    const task2 = page.locator(TASK).filter({ hasText: title2 }).first();

    await expect(task1.locator(TASK_SCHEDULE_BTN).first()).toBeVisible();
    await expect(task2.locator(TASK_SCHEDULE_BTN).first()).toBeVisible();

    // Navigate to scheduled page
    try {
      const scheduleRouteBtn = page.locator(SCHEDULE_ROUTE_BTN);
      await scheduleRouteBtn.waitFor({ state: 'visible', timeout: 5000 });
      await scheduleRouteBtn.first().click();
    } catch (error) {
      console.log('Nav button failed, using direct navigation');
      await page.goto('/#/scheduled-list');
    }

    // Wait for scheduled page to load
    await page.waitForSelector(SCHEDULE_PAGE_CMP, { state: 'visible', timeout: 10000 });

    // Wait for the scheduled tasks to render
    await page.waitForTimeout(1000);

    // Verify both tasks appear in scheduled list with retry
    await expect(async () => {
      const scheduledTasks = page.locator(SCHEDULE_PAGE_TASKS);
      await expect(scheduledTasks).toHaveCount(2);
    }).toPass({ timeout: 10000 });

    // Check that both titles are present somewhere in the scheduled list
    const allTaskTitles = page.locator(`${SCHEDULE_PAGE_TASKS} .title`);
    await expect(allTaskTitles.first()).toBeVisible();

    // Get all title texts and verify both are present
    const titles = await allTaskTitles.allTextContents();
    expect(titles.some((t) => t.includes(title1))).toBeTruthy();
    expect(titles.some((t) => t.includes(title2))).toBeTruthy();
  });
});

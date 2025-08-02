import { test, expect } from '../../fixtures/test.fixture';

const TASK = 'task';
const TASK_SCHEDULE_BTN = '.ico-btn.schedule-btn';

const SCHEDULE_ROUTE_BTN = 'button[routerlink="scheduled-list"]';
const SCHEDULE_PAGE_CMP = 'scheduled-list-page';
const SCHEDULE_PAGE_TASKS = `${SCHEDULE_PAGE_CMP} .tasks planner-task`;
const SCHEDULE_PAGE_TASK_1 = `${SCHEDULE_PAGE_TASKS}:first-of-type`;
// Note: not sure why this is the second child, but it is
const SCHEDULE_PAGE_TASK_2 = `${SCHEDULE_PAGE_TASKS}:nth-of-type(2)`;
const SCHEDULE_PAGE_TASK_1_TITLE_EL = `${SCHEDULE_PAGE_TASK_1} .title`;
// Note: not sure why this is the second child, but it is
const SCHEDULE_PAGE_TASK_2_TITLE_EL = `${SCHEDULE_PAGE_TASK_2} .title`;

test.describe.skip('Reminders Schedule Page', () => {
  test('should add a scheduled tasks', async ({ page, workViewPage, testPrefix }) => {
    await workViewPage.waitForTaskList();

    // Add task with reminder (manually implementing addTaskWithReminder)
    const title = `${testPrefix}-0 test task koko`;
    const scheduleTime = Date.now() + 10000; // Add 10 seconds buffer

    // Add task
    await workViewPage.addTask(title);
    await page.waitForSelector(TASK, { state: 'visible' });

    // Schedule task - use first() to avoid ambiguity
    const firstTask = page.locator(TASK).first();
    await firstTask.hover();
    const scheduleBtn = firstTask.locator(TASK_SCHEDULE_BTN);
    await scheduleBtn.waitFor({ state: 'visible' });
    await scheduleBtn.click();

    // Set schedule time in dialog
    const dialog = page.locator('dialog-schedule-task');
    await expect(dialog).toBeVisible();

    // Set time (convert timestamp to time string)
    const date = new Date(scheduleTime);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    await page.fill('input[type="time"]', `${hours}:${minutes}`);

    // Confirm
    await page.click('mat-dialog-actions button:last-of-type');

    // Verify schedule button is present
    await expect(firstTask.locator(TASK_SCHEDULE_BTN)).toBeVisible();

    // Navigate to scheduled page and check if entry is there
    await page.click(SCHEDULE_ROUTE_BTN);
    await expect(page.locator(SCHEDULE_PAGE_CMP)).toBeVisible();
    await expect(page.locator(SCHEDULE_PAGE_TASK_1)).toBeVisible();
    await expect(page.locator(SCHEDULE_PAGE_TASK_1_TITLE_EL)).toBeVisible();
    await expect(page.locator(SCHEDULE_PAGE_TASK_1_TITLE_EL)).toContainText(title);
  });

  test('should add multiple scheduled tasks', async ({
    page,
    workViewPage,
    testPrefix,
  }) => {
    await workViewPage.waitForTaskList();

    // First add the first task from previous test (needed for continuity)
    const title1 = `${testPrefix}-0 test task koko`;
    const scheduleTime1 = Date.now() + 10000;

    await workViewPage.addTask(title1);
    await page.waitForSelector(TASK, { state: 'visible' });

    // Schedule first task
    const firstTask = page.locator(TASK).first();
    await firstTask.hover();
    const scheduleBtn1 = firstTask.locator(TASK_SCHEDULE_BTN);
    await scheduleBtn1.waitFor({ state: 'visible' });
    await scheduleBtn1.click();

    const dialog1 = page.locator('dialog-schedule-task');
    await expect(dialog1).toBeVisible();

    const date1 = new Date(scheduleTime1);
    const hours1 = date1.getHours().toString().padStart(2, '0');
    const minutes1 = date1.getMinutes().toString().padStart(2, '0');
    await page.fill('input[type="time"]', `${hours1}:${minutes1}`);
    await page.click('mat-dialog-actions button:last-of-type');
    await dialog1.waitFor({ state: 'hidden' });

    // Click to go back to work context
    await page.click('.current-work-context-title');
    await workViewPage.waitForTaskList();

    // Add second task with reminder
    const title2 = `${testPrefix}-2 hihihi`;
    const scheduleTime2 = Date.now() + 10000;

    await workViewPage.addTask(title2);

    // Wait for both tasks to be visible
    await page.waitForFunction(() => {
      const tasks = document.querySelectorAll('task');
      return tasks.length >= 2;
    });

    // Schedule the second task (which will be the first in the list due to newest first)
    const allTasks = page.locator(TASK);
    const newestTask = allTasks.first();
    await newestTask.hover();
    const scheduleBtn2 = newestTask.locator(TASK_SCHEDULE_BTN);
    await scheduleBtn2.waitFor({ state: 'visible' });
    await scheduleBtn2.click();

    const dialog2 = page.locator('dialog-schedule-task');
    await expect(dialog2).toBeVisible();

    const date2 = new Date(scheduleTime2);
    const hours2 = date2.getHours().toString().padStart(2, '0');
    const minutes2 = date2.getMinutes().toString().padStart(2, '0');
    await page.fill('input[type="time"]', `${hours2}:${minutes2}`);
    await page.click('mat-dialog-actions button:last-of-type');
    await dialog2.waitFor({ state: 'hidden' });

    // Verify both tasks have schedule buttons
    const task1 = page.locator(TASK).filter({ hasText: title1 });
    const task2 = page.locator(TASK).filter({ hasText: title2 });
    await expect(task1.locator(TASK_SCHEDULE_BTN)).toBeVisible();
    await expect(task2.locator(TASK_SCHEDULE_BTN)).toBeVisible();

    // Navigate to scheduled page and check if entries are there
    await page.click(SCHEDULE_ROUTE_BTN);
    await expect(page.locator(SCHEDULE_PAGE_CMP)).toBeVisible();
    await expect(page.locator(SCHEDULE_PAGE_TASK_1)).toBeVisible();
    await expect(page.locator(SCHEDULE_PAGE_TASK_1_TITLE_EL)).toBeVisible();
    await expect(page.locator(SCHEDULE_PAGE_TASK_1_TITLE_EL)).toContainText(title1);
    await expect(page.locator(SCHEDULE_PAGE_TASK_2_TITLE_EL)).toContainText(title2);
  });
});

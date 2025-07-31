import { test, expect } from '../../fixtures/test.fixture';

const TASK = 'task';
const TASK_2 = `${TASK}:nth-of-type(1)`;
const TASK_SCHEDULE_BTN = '.ico-btn.schedule-btn';
const TASK_SCHEDULE_BTN_2 = TASK_2 + ' ' + TASK_SCHEDULE_BTN;

const SCHEDULE_ROUTE_BTN = 'button[routerlink="scheduled-list"]';
const SCHEDULE_PAGE_CMP = 'scheduled-list-page';
const SCHEDULE_PAGE_TASKS = `${SCHEDULE_PAGE_CMP} .tasks planner-task`;
const SCHEDULE_PAGE_TASK_1 = `${SCHEDULE_PAGE_TASKS}:first-of-type`;
// Note: not sure why this is the second child, but it is
const SCHEDULE_PAGE_TASK_2 = `${SCHEDULE_PAGE_TASKS}:nth-of-type(2)`;
const SCHEDULE_PAGE_TASK_1_TITLE_EL = `${SCHEDULE_PAGE_TASK_1} .title`;
// Note: not sure why this is the second child, but it is
const SCHEDULE_PAGE_TASK_2_TITLE_EL = `${SCHEDULE_PAGE_TASK_2} .title`;

test.describe('Reminders Schedule Page', () => {
  test('should add a scheduled tasks', async ({ page, workViewPage }) => {
    await workViewPage.waitForTaskList();

    // Add task with reminder (manually implementing addTaskWithReminder)
    const title = '0 test task koko';
    const scheduleTime = Date.now() + 10000; // Add 10 seconds buffer

    // Add task
    await workViewPage.addTask(title);
    await page.waitForSelector(TASK, { state: 'visible' });

    // Schedule task
    await page.hover(TASK);
    await page.waitForSelector(TASK_SCHEDULE_BTN, { state: 'visible' });
    await page.click(TASK_SCHEDULE_BTN);

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
    await expect(page.locator(TASK_SCHEDULE_BTN)).toBeVisible();

    // Navigate to scheduled page and check if entry is there
    await page.click(SCHEDULE_ROUTE_BTN);
    await expect(page.locator(SCHEDULE_PAGE_CMP)).toBeVisible();
    await expect(page.locator(SCHEDULE_PAGE_TASK_1)).toBeVisible();
    await expect(page.locator(SCHEDULE_PAGE_TASK_1_TITLE_EL)).toBeVisible();
    await expect(page.locator(SCHEDULE_PAGE_TASK_1_TITLE_EL)).toContainText(
      '0 test task koko',
    );
  });

  test('should add multiple scheduled tasks', async ({ page, workViewPage }) => {
    await workViewPage.waitForTaskList();

    // First add the first task from previous test (needed for continuity)
    const title1 = '0 test task koko';
    const scheduleTime1 = Date.now() + 10000;

    await workViewPage.addTask(title1);
    await page.waitForSelector(TASK, { state: 'visible' });

    await page.hover(TASK);
    await page.waitForSelector(TASK_SCHEDULE_BTN, { state: 'visible' });
    await page.click(TASK_SCHEDULE_BTN);

    const dialog1 = page.locator('dialog-schedule-task');
    await expect(dialog1).toBeVisible();

    const date1 = new Date(scheduleTime1);
    const hours1 = date1.getHours().toString().padStart(2, '0');
    const minutes1 = date1.getMinutes().toString().padStart(2, '0');
    await page.fill('input[type="time"]', `${hours1}:${minutes1}`);
    await page.click('mat-dialog-actions button:last-of-type');

    // Click to go back to work context
    await page.click('.current-work-context-title');
    await workViewPage.waitForTaskList();
    await page.waitForTimeout(1000);

    // Add second task with reminder
    const title2 = '2 hihihi';
    const scheduleTime2 = Date.now() + 10000;

    await workViewPage.addTask(title2);

    // Schedule the second task (which will be the first in the list due to newest first)
    await page.hover(TASK_2);
    await page.waitForSelector(TASK_SCHEDULE_BTN_2, { state: 'visible' });
    await page.click(TASK_SCHEDULE_BTN_2);

    const dialog2 = page.locator('dialog-schedule-task');
    await expect(dialog2).toBeVisible();

    const date2 = new Date(scheduleTime2);
    const hours2 = date2.getHours().toString().padStart(2, '0');
    const minutes2 = date2.getMinutes().toString().padStart(2, '0');
    await page.fill('input[type="time"]', `${hours2}:${minutes2}`);
    await page.click('mat-dialog-actions button:last-of-type');

    // Verify both schedule buttons are present
    await expect(page.locator(TASK_SCHEDULE_BTN).first()).toBeVisible();
    await expect(page.locator(TASK_SCHEDULE_BTN_2)).toBeVisible();

    // Navigate to scheduled page and check if entries are there
    await page.click(SCHEDULE_ROUTE_BTN);
    await expect(page.locator(SCHEDULE_PAGE_CMP)).toBeVisible();
    await expect(page.locator(SCHEDULE_PAGE_TASK_1)).toBeVisible();
    await expect(page.locator(SCHEDULE_PAGE_TASK_1_TITLE_EL)).toBeVisible();
    await expect(page.locator(SCHEDULE_PAGE_TASK_1_TITLE_EL)).toContainText(
      '0 test task koko',
    );
    await expect(page.locator(SCHEDULE_PAGE_TASK_2_TITLE_EL)).toContainText('2 hihihi');
  });
});

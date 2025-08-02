import { expect, test } from '../../fixtures/test.fixture';

const DIALOG = 'dialog-view-task-reminder';
const DIALOG_TASKS_WRAPPER = `${DIALOG} .tasks`;
const DIALOG_TASK = `${DIALOG} .task`;
const DIALOG_TASK1 = `${DIALOG_TASK}:first-of-type`;
const DIALOG_TASK2 = `${DIALOG_TASK}:nth-of-type(2)`;
const SCHEDULE_MAX_WAIT_TIME = 180000;

// Helper selectors for task scheduling
const TASK = 'task';
const SCHEDULE_TASK_ITEM = 'task-detail-item:nth-child(2)';
const SCHEDULE_DIALOG = 'mat-dialog-container';
const DIALOG_SUBMIT = `${SCHEDULE_DIALOG} mat-dialog-actions button:last-of-type`;
const TIME_INP = 'input[type="time"]';
const SIDE_INNER = '.right-panel';
const DEFAULT_DELTA = 5000; // 5 seconds instead of 1.2 minutes

test.describe.serial('Reminders View Task 2', () => {
  const addTaskWithReminder = async (
    page: any,
    workViewPage: any,
    title: string,
    scheduleTime: number = Date.now() + DEFAULT_DELTA,
  ): Promise<void> => {
    // Add task
    await workViewPage.addTask(title);

    // Open task panel by hovering and clicking the detail button
    const taskSel = page.locator(TASK).first();
    await taskSel.waitFor({ state: 'visible' });
    await taskSel.hover();
    const detailPanelBtn = page.locator('.show-additional-info-btn').first();
    await detailPanelBtn.waitFor({ state: 'visible' });
    await detailPanelBtn.click();
    await page.waitForSelector(SIDE_INNER, { state: 'visible' });

    // Click schedule item
    await page.click(SCHEDULE_TASK_ITEM);
    await page.waitForSelector(SCHEDULE_DIALOG, { state: 'visible' });

    // Set time
    const d = new Date(scheduleTime);
    const timeValue = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

    const timeInput = page.locator(TIME_INP);
    await timeInput.click();
    await timeInput.clear();
    await timeInput.fill(timeValue);
    await page.keyboard.press('Tab');

    // Submit
    await page.click(DIALOG_SUBMIT);
    await page.waitForSelector(SCHEDULE_DIALOG, { state: 'hidden' });
  };

  test('should display a modal with 2 scheduled task if due', async ({
    page,
    workViewPage,
    testPrefix,
  }) => {
    test.setTimeout(SCHEDULE_MAX_WAIT_TIME + 60000); // Add extra buffer

    await workViewPage.waitForTaskList();

    // Add two tasks with reminders using test prefix
    const task1Name = `${testPrefix}-0 B task`;
    const task2Name = `${testPrefix}-1 B task`;

    await addTaskWithReminder(page, workViewPage, task1Name);
    await addTaskWithReminder(page, workViewPage, task2Name, Date.now() + 5000);

    // Wait for reminder dialog
    await page.waitForSelector(DIALOG, {
      state: 'visible',
      timeout: SCHEDULE_MAX_WAIT_TIME,
    });

    // Verify both tasks are shown
    await expect(page.locator(DIALOG_TASK1)).toBeVisible();
    await expect(page.locator(DIALOG_TASK2)).toBeVisible();
    await expect(page.locator(DIALOG_TASKS_WRAPPER)).toContainText(task1Name);
    await expect(page.locator(DIALOG_TASKS_WRAPPER)).toContainText(task2Name);
  });
});

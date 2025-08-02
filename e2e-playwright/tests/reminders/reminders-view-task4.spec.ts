import { expect, test } from '../../fixtures/test.fixture';

const DIALOG = 'dialog-view-task-reminder';
const DIALOG_TASKS_WRAPPER = `${DIALOG} .tasks`;
const DIALOG_TASK = `${DIALOG} .task`;
const DIALOG_TASK1 = `${DIALOG_TASK}:first-of-type`;
const DIALOG_TASK2 = `${DIALOG_TASK}:nth-of-type(2)`;
const DIALOG_TASK3 = `${DIALOG_TASK}:nth-of-type(3)`;
const TO_TODAY_SUF = ' .actions button:last-of-type';
const SCHEDULE_MAX_WAIT_TIME = 180000;

// Helper selectors for task scheduling
const TASK = 'task';
const SCHEDULE_TASK_ITEM = 'task-detail-item:nth-child(2)';
const SCHEDULE_DIALOG = 'mat-dialog-container';
const DIALOG_SUBMIT = `${SCHEDULE_DIALOG} mat-dialog-actions button:last-of-type`;
const TIME_INP = 'input[type="time"]';
const RIGHT_PANEL = '.right-panel';
const DEFAULT_DELTA = 5000; // 5 seconds instead of 1.2 minutes

test.describe.serial('Reminders View Task 4', () => {
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
    await page.waitForSelector(RIGHT_PANEL, { state: 'visible' });

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

  test('should manually empty list via add to today', async ({
    page,
    workViewPage,
    testPrefix,
  }) => {
    test.setTimeout(SCHEDULE_MAX_WAIT_TIME + 120000);

    await workViewPage.waitForTaskList();

    const start = Date.now() + 10000; // Reduce from 100 seconds to 10 seconds

    // Add three tasks with reminders using test prefix
    const task1Name = `${testPrefix}-0 D task xyz`;
    const task2Name = `${testPrefix}-1 D task xyz`;
    const task3Name = `${testPrefix}-2 D task xyz`;

    await addTaskWithReminder(page, workViewPage, task1Name, start);
    await addTaskWithReminder(page, workViewPage, task2Name, start);
    await addTaskWithReminder(page, workViewPage, task3Name, Date.now() + 5000);

    // Wait for reminder dialog
    await page.waitForSelector(DIALOG, {
      state: 'visible',
      timeout: SCHEDULE_MAX_WAIT_TIME + 120000,
    });

    // Wait for all tasks to be present
    await page.waitForSelector(DIALOG_TASK1, { state: 'visible' });
    await page.waitForSelector(DIALOG_TASK2, { state: 'visible' });
    await page.waitForSelector(DIALOG_TASK3, { state: 'visible' });

    // Verify all tasks are shown
    await expect(page.locator(DIALOG_TASKS_WRAPPER)).toContainText(task1Name);
    await expect(page.locator(DIALOG_TASKS_WRAPPER)).toContainText(task2Name);
    await expect(page.locator(DIALOG_TASKS_WRAPPER)).toContainText(task3Name);

    // Click "add to today" buttons
    await page.click(DIALOG_TASK1 + TO_TODAY_SUF);
    await page.click(DIALOG_TASK2 + TO_TODAY_SUF);

    // Verify remaining task contains 'D task xyz'
    await expect(page.locator(DIALOG_TASK1)).toContainText('D task xyz');
  });
});

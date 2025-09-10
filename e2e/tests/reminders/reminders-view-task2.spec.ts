import { expect, test } from '../../fixtures/test.fixture';

const DIALOG = 'dialog-view-task-reminder';
const DIALOG_TASKS_WRAPPER = `${DIALOG} .tasks`;
const DIALOG_TASK = `${DIALOG} .task`;
const DIALOG_TASK1 = `${DIALOG_TASK}:first-of-type`;
const DIALOG_TASK2 = `${DIALOG_TASK}:nth-of-type(2)`;
const SCHEDULE_MAX_WAIT_TIME = 60000; // Reduced from 180s to 60s

// Helper selectors for task scheduling
const TASK = 'task';
const SCHEDULE_TASK_ITEM =
  'task-detail-item:has(mat-icon:text("alarm")), task-detail-item:has(mat-icon:text("today")), task-detail-item:has(mat-icon:text("schedule"))';
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

    // Click schedule item with better error handling
    const scheduleItem = page.locator(SCHEDULE_TASK_ITEM);
    await scheduleItem.waitFor({ state: 'visible', timeout: 5000 });
    await scheduleItem.click();

    const scheduleDialog = page.locator(SCHEDULE_DIALOG);
    await scheduleDialog.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(200); // Allow dialog animation

    // Set time with improved robustness
    const d = new Date(scheduleTime);
    const timeValue = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

    // Use more robust selector and multiple fallback approaches
    const timeInput = page
      .locator('mat-form-field input[type="time"]')
      .or(page.locator(TIME_INP));
    await timeInput.waitFor({ state: 'visible', timeout: 10000 });

    await timeInput.click();
    await page.waitForTimeout(100);

    // Clear and set value
    await timeInput.fill('');
    await page.waitForTimeout(100);
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

    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // Submit with better handling
    const submitBtn = page.locator(DIALOG_SUBMIT);
    await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
    await submitBtn.click();

    await scheduleDialog.waitFor({ state: 'hidden', timeout: 10000 });
  };

  test('should display a modal with 2 scheduled task if due', async ({
    page,
    workViewPage,
    testPrefix,
  }) => {
    test.setTimeout(SCHEDULE_MAX_WAIT_TIME + 30000); // Add extra buffer

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

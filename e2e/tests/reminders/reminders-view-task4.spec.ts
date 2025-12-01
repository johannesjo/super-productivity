import { expect, test } from '../../fixtures/test.fixture';

const DIALOG = 'dialog-view-task-reminder';
const DIALOG_TASKS_WRAPPER = `${DIALOG} .tasks`;
const DIALOG_TASK = `${DIALOG} .task`;
const DIALOG_TASK1 = `${DIALOG_TASK}:first-of-type`;
const DIALOG_TASK2 = `${DIALOG_TASK}:nth-of-type(2)`;
const DIALOG_TASK3 = `${DIALOG_TASK}:nth-of-type(3)`;
const TO_TODAY_SUF = ' .actions button:last-of-type';
const SCHEDULE_MAX_WAIT_TIME = 60000; // Reduced from 180s to 60s

// Helper selectors for task scheduling
const SCHEDULE_TASK_ITEM =
  'task-detail-item:has(mat-icon:text("alarm")), task-detail-item:has(mat-icon:text("today")), task-detail-item:has(mat-icon:text("schedule"))';
const DIALOG_CONTAINER = 'mat-dialog-container';
const DIALOG_SUBMIT = `${DIALOG_CONTAINER} mat-dialog-actions button:last-of-type`;
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
    // Add task (title should already include test prefix)
    await workViewPage.addTask(title);

    // Wait for task to be fully rendered before proceeding
    await page.waitForTimeout(800);

    // Open task panel by hovering and clicking the detail button
    // Find the specific task by title to ensure we're working with the right one
    const specificTaskSelector =
      `task:has-text("${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}")`.substring(
        0,
        200,
      ); // Limit selector length
    const taskSel = page.locator(specificTaskSelector).first();
    await taskSel.waitFor({ state: 'visible', timeout: 10000 });

    // Ensure task is fully loaded by checking for task content and that it's not moving
    await page.waitForTimeout(500);
    await taskSel.scrollIntoViewIfNeeded();

    await taskSel.hover();
    const detailPanelBtn = taskSel.locator('.show-additional-info-btn').first();
    await detailPanelBtn.waitFor({ state: 'visible', timeout: 5000 });
    await detailPanelBtn.click();
    await page.waitForSelector(RIGHT_PANEL, { state: 'visible', timeout: 10000 });

    // Wait for and click schedule task item with better error handling
    const scheduleItem = page.locator(SCHEDULE_TASK_ITEM);
    await scheduleItem.waitFor({ state: 'visible', timeout: 10000 });

    // Ensure the schedule item is clickable
    await scheduleItem.waitFor({ state: 'attached' });
    await page.waitForTimeout(200);
    await scheduleItem.click();

    // Wait for dialog with improved timeout
    const dialogContainer = page.locator(DIALOG_CONTAINER);
    await dialogContainer.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(200); // Allow dialog animation to complete

    // Set time - use more robust selector and approach
    const d = new Date(scheduleTime);
    const timeValue = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

    const timeInput = page
      .locator('mat-form-field input[type="time"]')
      .or(page.locator(TIME_INP));
    await timeInput.waitFor({ state: 'visible', timeout: 10000 });

    // Multiple approaches to ensure the time input is ready
    await timeInput.click();
    await page.waitForTimeout(100);

    // Clear existing value if any
    await timeInput.fill('');
    await page.waitForTimeout(100);

    // Set the time value
    await timeInput.fill(timeValue);
    await page.waitForTimeout(100);

    // Verify the value was set
    const inputValue = await timeInput.inputValue();
    if (inputValue !== timeValue) {
      // Fallback: use evaluate to set value directly
      await page.evaluate(
        ({ value }: { value: string }) => {
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

    // Ensure focus moves away to commit the value
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // Submit dialog
    await page.waitForSelector(DIALOG_SUBMIT, { state: 'visible' });
    await page.click(DIALOG_SUBMIT);
    await page.waitForSelector(DIALOG_CONTAINER, { state: 'hidden' });

    // Wait for UI to fully settle after dialog closes
    await page.waitForTimeout(500);
  };

  test('should manually empty list via add to today', async ({
    page,
    workViewPage,
    testPrefix,
  }) => {
    test.setTimeout(SCHEDULE_MAX_WAIT_TIME + 60000); // Reduced extra time

    await workViewPage.waitForTaskList();

    const start = Date.now() + 10000; // Reduce from 100 seconds to 10 seconds

    // Add three tasks with reminders using test prefix
    const task1Name = `${testPrefix}-0 D task xyz`;
    const task2Name = `${testPrefix}-1 D task xyz`;
    const task3Name = `${testPrefix}-2 D task xyz`;

    // Add tasks with proper spacing to avoid interference
    await addTaskWithReminder(page, workViewPage, task1Name, start);
    await page.waitForTimeout(2000); // Ensure first task is fully processed

    await addTaskWithReminder(page, workViewPage, task2Name, start);
    await page.waitForTimeout(2000); // Ensure second task is fully processed

    await addTaskWithReminder(page, workViewPage, task3Name, Date.now() + 5000);
    await page.waitForTimeout(2000); // Ensure third task is fully processed

    // Wait for reminder dialog
    await page.waitForSelector(DIALOG, {
      state: 'visible',
      timeout: SCHEDULE_MAX_WAIT_TIME + 60000, // Reduced timeout
    });

    // Wait for all tasks to be present
    await page.waitForSelector(DIALOG_TASK1, { state: 'visible' });
    await page.waitForSelector(DIALOG_TASK2, { state: 'visible' });
    await page.waitForSelector(DIALOG_TASK3, { state: 'visible' });

    // Verify all tasks are shown
    await expect(page.locator(DIALOG_TASKS_WRAPPER)).toContainText(task1Name);
    await expect(page.locator(DIALOG_TASKS_WRAPPER)).toContainText(task2Name);
    await expect(page.locator(DIALOG_TASKS_WRAPPER)).toContainText(task3Name);

    // Click "add to today" buttons with proper waits
    const button1 = page.locator(DIALOG_TASK1 + TO_TODAY_SUF);
    await button1.waitFor({ state: 'visible', timeout: 5000 });
    await button1.click();
    await page.waitForTimeout(500); // Allow first click to process

    const button2 = page.locator(DIALOG_TASK2 + TO_TODAY_SUF);
    await button2.waitFor({ state: 'visible', timeout: 5000 });
    await button2.click();
    await page.waitForTimeout(500); // Allow second click to process

    // Verify remaining task contains 'D task xyz'
    await page.waitForTimeout(1000); // Allow dialog state to update
    await expect(page.locator(DIALOG_TASK1)).toContainText('D task xyz');
  });
});

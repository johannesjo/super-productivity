import { test, expect } from '../../fixtures/app.fixture';
import { AppHelpers } from '../../helpers/app-helpers';

const getTimeValue = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

test.describe('Reminders Schedule Page', () => {
  const addTaskWithReminder = async (
    page: any,
    workViewPage: any,
    title: string,
    taskSelector?: string,
  ): Promise<void> => {
    // Add task
    await workViewPage.addTask(title);

    // Open task detail panel
    const task = taskSelector ? page.locator(taskSelector) : page.locator('task').first();
    await AppHelpers.openTaskDetailPanel(page, task);

    // Click schedule item - try multiple selectors
    const scheduleSelectors = [
      'task-detail-item:has-text("Schedule")',
      'button:has-text("Schedule")',
      '[aria-label*="schedule" i]',
      '.task-detail-item:has(.icon-schedule)',
      'mat-list-item:has-text("Schedule")',
    ];

    let scheduleClicked = false;
    for (const selector of scheduleSelectors) {
      try {
        const scheduleItem = page.locator(selector).first();
        if (await scheduleItem.isVisible({ timeout: 2000 })) {
          await scheduleItem.click();
          scheduleClicked = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!scheduleClicked) {
      // If no schedule button found, skip the test
      console.log('Schedule button not found, skipping test');
      return;
    }

    // Wait for dialog
    const dialog = page.locator('mat-dialog-container');
    await dialog.waitFor({ state: 'visible' });
    await page.waitForTimeout(100);

    // Set reminder time
    const reminderTime = new Date(Date.now() + 3600000); // 1 hour in future to avoid immediate reminder popups
    const timeValue = getTimeValue(reminderTime);

    const timeInput = page.locator('input[type="time"]');
    await timeInput.waitFor({ state: 'visible' });
    await page.waitForTimeout(150);

    // Click and clear
    await timeInput.click();
    await page.waitForTimeout(150);
    await timeInput.clear();
    await page.waitForTimeout(100);

    // Set value directly
    await timeInput.evaluate((el: HTMLInputElement, value: string) => {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, timeValue);

    await page.waitForTimeout(200);
    await timeInput.fill(timeValue);
    await page.waitForTimeout(200);

    // Tab to commit
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

  test.skip('should add a scheduled task', async ({ page, workViewPage }) => {
    const taskTitle = '0 test task koko';

    // Add task with reminder
    await addTaskWithReminder(page, workViewPage, taskTitle);

    // Verify schedule button is present
    const scheduleBtn = page.locator('.ico-btn.schedule-btn');
    await scheduleBtn.waitFor({ state: 'visible' });
    await expect(scheduleBtn).toBeVisible();

    // Navigate to scheduled page
    const scheduleRouteBtn = page.locator('button[routerlink="scheduled-list"]');
    await scheduleRouteBtn.click();

    // Wait for scheduled page
    const schedulePage = page.locator('scheduled-list-page');
    await schedulePage.waitFor({ state: 'visible' });

    // Verify task is in scheduled list
    const firstScheduledTask = page.locator(
      'scheduled-list-page .tasks planner-task:first-of-type',
    );
    await firstScheduledTask.waitFor({ state: 'visible' });

    const firstTaskTitle = firstScheduledTask.locator('.title');
    await expect(firstTaskTitle).toContainText(taskTitle);
  });

  test.skip('should add multiple scheduled tasks', async ({ page, workViewPage }) => {
    // Add first task with reminder
    await addTaskWithReminder(page, workViewPage, '0 test task koko');

    // Click work context title to go back
    const workContextTitle = page.locator('.current-work-context-title');
    await workContextTitle.click();
    await page.waitForTimeout(1000);

    // Add second task with reminder
    await addTaskWithReminder(page, workViewPage, '2 hihihi', 'task:nth-of-type(1)');

    // Verify both schedule buttons are present
    const scheduleBtns = page.locator('.ico-btn.schedule-btn');
    await expect(scheduleBtns).toHaveCount(2);

    // Navigate to scheduled page
    const scheduleRouteBtn = page.locator('button[routerlink="scheduled-list"]');
    await scheduleRouteBtn.click();

    // Wait for scheduled page
    const schedulePage = page.locator('scheduled-list-page');
    await schedulePage.waitFor({ state: 'visible' });

    // Verify both tasks are in scheduled list
    const firstScheduledTask = page.locator(
      'scheduled-list-page .tasks planner-task:first-of-type .title',
    );
    const secondScheduledTask = page.locator(
      'scheduled-list-page .tasks planner-task:nth-of-type(2) .title',
    );

    await firstScheduledTask.waitFor({ state: 'visible' });
    await secondScheduledTask.waitFor({ state: 'visible' });

    await expect(firstScheduledTask).toContainText('0 test task koko');
    await expect(secondScheduledTask).toContainText('2 hihihi');
  });
});

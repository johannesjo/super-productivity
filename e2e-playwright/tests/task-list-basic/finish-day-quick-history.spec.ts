import { expect, test } from '../../fixtures/test.fixture';

const TASK_SEL = 'task';
const TASK_TEXTAREA = 'task textarea';
const FINISH_DAY_BTN = '.e2e-finish-day';
const SAVE_AND_GO_HOME_BTN = 'button[mat-flat-button][color="primary"]:last-of-type';
const TABLE_CAPTION = 'quick-history h3';
const TABLE_ROWS = 'table tr';

test.describe('Finish Day Quick History', () => {
  test('should create task, mark as done, finish day and view in quick history', async ({
    page,
    workViewPage,
  }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Create a task
    await workViewPage.addTask('Task for Quick History');
    await page.waitForSelector(TASK_SEL, { state: 'visible' });
    const taskTextarea = page.locator(TASK_TEXTAREA);
    await expect(taskTextarea).toHaveValue('Task for Quick History');

    // Mark task as done
    await page.waitForSelector(TASK_SEL, { state: 'visible' });
    await page.waitForTimeout(100);
    const task = page.locator(TASK_SEL).first();
    await task.hover();
    await page.waitForSelector(`${TASK_SEL} .task-done-btn`, { state: 'visible' });
    await page.click(`${TASK_SEL} .task-done-btn`);
    await page.waitForTimeout(500);

    // Click Finish Day button
    await page.waitForSelector(FINISH_DAY_BTN, { state: 'visible' });
    await page.click(FINISH_DAY_BTN);
    await page.waitForTimeout(500);

    // Wait for route change and click Save and go home
    await page.waitForSelector('daily-summary', { state: 'visible' });
    await page.waitForTimeout(500);
    await page.waitForSelector(SAVE_AND_GO_HOME_BTN, { state: 'visible' });
    await page.click(SAVE_AND_GO_HOME_BTN);
    await page.waitForTimeout(1000);

    // Navigate to quick history via left-hand menu
    await page.click('side-nav > section.main > side-nav-item.g-multi-btn-wrapper', {
      button: 'right',
    });
    await page.waitForSelector('work-context-menu > button:nth-child(1)', {
      state: 'visible',
    });
    await page.click('work-context-menu > button:nth-child(1)');
    await page.waitForTimeout(500);
    await page.waitForSelector('quick-history', { state: 'visible' });

    // Click on table caption
    await page.waitForSelector(TABLE_CAPTION, { state: 'visible' });
    await page.click(TABLE_CAPTION);
    await page.waitForTimeout(500);

    // Confirm quick history page loads
    await expect(page.locator('quick-history')).toBeVisible();

    // Confirm task is in the table
    await page.waitForSelector(TABLE_ROWS, { state: 'visible' });
    await expect(page.locator(TABLE_ROWS)).toBeVisible();
    await page.waitForSelector('table > tr:nth-child(1) > td.title > span', {
      state: 'visible',
    });
    // Verify the task title is present in the table
    const taskTitle = page.locator('table > tr:nth-child(1) > td.title > span');
    await expect(taskTitle).toContainText('Task for Quick History');
  });
});

import { expect, test } from '../../fixtures/test.fixture';

const SUMMARY_TABLE_TASK_EL = '.task-title .value-wrapper';

test.describe('Daily Summary', () => {
  test('Daily summary message', async ({ page }) => {
    // Navigate directly to daily summary page
    await page.goto('/#/tag/TODAY/daily-summary');

    // Wait for done headline to be visible
    await page.waitForSelector('.done-headline', { state: 'visible' });

    // Assert the text content
    const doneHeadline = page.locator('.done-headline');
    await expect(doneHeadline).toContainText('Take a moment to celebrate');
  });

  test('show any added task in table', async ({ page, workViewPage }) => {
    // First navigate to work view to add task
    await page.goto('/');
    await workViewPage.waitForTaskList();

    // Add task
    await workViewPage.addTask('test task hohoho 1h/1h');

    // Navigate to daily summary
    await page.goto('/#/tag/TODAY/daily-summary');

    // Wait for task element in summary table
    await page.waitForSelector(SUMMARY_TABLE_TASK_EL, { state: 'visible' });

    // Assert task appears in summary
    const taskElement = page.locator(SUMMARY_TABLE_TASK_EL);
    await expect(taskElement).toContainText('test task hohoho');
  });
});

import { test, expect } from '../../fixtures/app.fixture';

test.describe('Daily Summary', () => {
  test('displays celebration message', async ({ page }) => {
    // Navigate to daily summary
    await page.goto('#/tag/TODAY/daily-summary');

    // Wait for done headline
    const doneHeadline = page.locator('.done-headline');
    await doneHeadline.waitFor({ state: 'visible' });

    // Verify celebration message
    await expect(doneHeadline).toContainText('Take a moment to celebrate');
  });

  test.skip('shows added task in table', async ({ page, workViewPage }) => {
    // Add a task first
    const taskTitle = 'test task hohoho 1h/1h';
    await workViewPage.addTask(taskTitle);

    // Navigate to daily summary
    await page.goto('#/tag/TODAY/daily-summary');

    // Wait for task in summary table
    const summaryTableTask = page.locator('.task-title .value-wrapper');
    await summaryTableTask.waitFor({ state: 'visible' });

    // Verify task appears in table
    await expect(summaryTableTask).toContainText('test task hohoho');
  });
});

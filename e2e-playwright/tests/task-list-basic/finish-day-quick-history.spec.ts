import { test, expect } from '../../fixtures/app.fixture';

test.describe('Finish Day and Quick History', () => {
  const taskTitle = 'Task for Quick History';

  test.skip('complete workflow: create task, mark done, finish day, view in quick history', async ({
    page,
    workViewPage,
  }) => {
    // Create a task
    await workViewPage.addTask(taskTitle);
    const task = page.locator('task').first();
    await task.waitFor({ state: 'visible' });
    const taskTextarea = task.locator('textarea');
    await expect(taskTextarea).toHaveValue(taskTitle);

    // Mark task as done
    await page.waitForTimeout(100);
    await task.hover({ position: { x: 12, y: 12 } });
    const doneBtn = task.locator('.task-done-btn');
    await doneBtn.waitFor({ state: 'visible' });
    await doneBtn.click();
    await page.waitForTimeout(500);

    // Click Finish Day button
    const finishDayBtn = page.locator('.e2e-finish-day');
    await finishDayBtn.waitFor({ state: 'visible' });
    await finishDayBtn.click();
    await page.waitForTimeout(500);

    // Wait for daily summary page
    const dailySummary = page.locator('daily-summary');
    await dailySummary.waitFor({ state: 'visible' });
    await page.waitForTimeout(500);

    // Click Save and go home
    const saveAndGoHomeBtn = page.locator(
      'button[mat-flat-button][color="primary"]:last-of-type',
    );
    await saveAndGoHomeBtn.waitFor({ state: 'visible' });
    await saveAndGoHomeBtn.click();
    await page.waitForTimeout(1000);

    // Navigate to quick history via right-click menu
    const sideNavItem = page.locator(
      'side-nav > section.main > side-nav-item.g-multi-btn-wrapper',
    );
    await sideNavItem.click({ button: 'right' });

    const workContextMenu = page.locator('work-context-menu');
    await workContextMenu.waitFor({ state: 'visible' });
    const quickHistoryBtn = workContextMenu.locator('button:nth-child(1)');
    await quickHistoryBtn.click();
    await page.waitForTimeout(500);

    // Verify quick history page
    const quickHistory = page.locator('quick-history');
    await quickHistory.waitFor({ state: 'visible' });
    await expect(quickHistory).toBeVisible();

    // Click on table caption
    const tableCaption = page.locator('quick-history h3');
    await tableCaption.waitFor({ state: 'visible' });
    await tableCaption.click();
    await page.waitForTimeout(500);

    // Verify task is in the table
    const tableRows = page.locator('table tr');
    await tableRows.first().waitFor({ state: 'visible' });
    await expect(tableRows).toBeVisible();

    const taskTitleCell = page.locator('table > tr:nth-child(1) > td.title > span');
    await taskTitleCell.waitFor({ state: 'visible' });
    await expect(taskTitleCell).toContainText(taskTitle);

    // Verify no console errors
    const errorAlert = page.locator('.global-error-alert');
    await expect(errorAlert).not.toBeVisible();
  });
});

import { expect, test } from '../../fixtures/test.fixture';
import { waitForStatePersistence } from '../../utils/waits';

/**
 * Recently deleted (#2778): a deleted task can be recovered after the undo
 * snack is gone — here even after a reload — from the quiet link at the
 * bottom of History.
 */
test.describe('Recently deleted', () => {
  test('restores a deleted task with its subtask after a reload', async ({
    page,
    workViewPage,
    taskPage,
    testPrefix,
  }) => {
    await workViewPage.waitForTaskList();
    const parentTitle = `${testPrefix}-Trash parent`;
    const childTitle = `${testPrefix}-Trash child`;
    await workViewPage.addTask(parentTitle);
    const parent = taskPage.getTaskByText(parentTitle).first();
    await expect(parent).toBeVisible();
    await workViewPage.addSubTask(parent, childTitle);
    await expect(
      page.locator('.sub-tasks task').filter({ hasText: childTitle }),
    ).toBeVisible();

    // Delete the parent (and with it the subtask) through the context menu.
    await parent.locator('task-title').first().click({ button: 'right' });
    await page.locator('.mat-mdc-menu-content button.color-warn').click();
    await page.locator('[e2e="confirmBtn"]').click();
    await expect(taskPage.getTaskByText(parentTitle)).toHaveCount(0);

    // The undo snack is long gone after a reload.
    await waitForStatePersistence(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await workViewPage.waitForTaskList();
    await expect(taskPage.getTaskByText(parentTitle)).toHaveCount(0);

    await page.goto('/#/tag/TODAY/history');
    await page.locator('history .recently-deleted-btn').click();

    const dialog = page.locator('dialog-recently-deleted');
    const entry = dialog.locator('.entry').filter({ hasText: parentTitle });
    await expect(entry).toBeVisible();
    await expect(entry).toContainText('+1 subtasks');

    await entry.locator('.restore-btn').click();
    await expect(dialog.locator('.entry')).toHaveCount(0);
    await expect(dialog.locator('.none')).toBeVisible();
    await dialog.locator('button[mat-dialog-close]').click();

    await page.goto('/#/tag/TODAY/tasks');
    await workViewPage.waitForTaskList();
    const restored = taskPage.getTaskByText(parentTitle).first();
    await expect(restored).toBeVisible();
    await expect(
      restored.locator('.sub-tasks task').filter({ hasText: childTitle }),
    ).toBeVisible();
  });

  test('empties the trash', async ({ page, workViewPage, taskPage, testPrefix }) => {
    await workViewPage.waitForTaskList();
    const title = `${testPrefix}-Trash empty`;
    await workViewPage.addTask(title);
    const task = taskPage.getTaskByText(title).first();
    await task.locator('task-title').first().click({ button: 'right' });
    await page.locator('.mat-mdc-menu-content button.color-warn').click();
    await page.locator('[e2e="confirmBtn"]').click();
    await expect(taskPage.getTaskByText(title)).toHaveCount(0);

    await page.goto('/#/tag/TODAY/history');
    await page.locator('history .recently-deleted-btn').click();
    const dialog = page.locator('dialog-recently-deleted');
    await expect(dialog.locator('.entry').filter({ hasText: title })).toBeVisible();

    await dialog.locator('.empty-btn').click();
    await page.locator('dialog-confirm [e2e="confirmBtn"]').click();
    await expect(dialog.locator('.entry')).toHaveCount(0);
    await expect(dialog.locator('.empty-btn')).toBeDisabled();
  });
});

import { Locator, Page } from 'playwright/test';

import { expect, test } from '../../fixtures/test.fixture';
import { WorkViewPage } from '../../pages/work-view.page';

test.describe('Task detail', () => {
  test.use({ locale: 'en-US', timezoneId: 'UTC' });

  const addAndOpenIncompleteTask = async (
    workViewPage: WorkViewPage,
    page: Page,
  ): Promise<void> => {
    await workViewPage.waitForTaskList();

    await workViewPage.addTask('task');
    await page.getByText(/task/).first().hover();
    await page.getByRole('button', { name: 'Show/Hide additional info' }).click();
  };

  const addAndOpenCompleteTask = async (
    workViewPage: WorkViewPage,
    page: Page,
  ): Promise<void> => {
    await addAndOpenIncompleteTask(workViewPage, page);

    await page.getByText(/task/).first().hover();
    await page.getByRole('button', { name: 'Mark as done/undone' }).click();
  };

  const findTaskDetailItem = (
    page: Page,
    title: string,
    requireValue = true,
  ): Locator => {
    let item = page.locator('task-detail-item').filter({
      has: page.locator('.input-item__title', { hasText: new RegExp(title, 'i') }),
    });
    if (requireValue) {
      // Cannot assert against specific datetime values since they are being
      // dynamically generated. Match conditions also deliberately avoid
      // assuming specific locale formatting requirements for leniency.
      item = item.filter({ has: page.locator('.input-item__value', { hasText: /\d+/ }) });
    }
    return item;
  };

  test('should show created for task', async ({ page, workViewPage }) => {
    await addAndOpenIncompleteTask(workViewPage, page);

    await expect(findTaskDetailItem(page, 'Created')).toHaveCount(1);
  });

  test('should not show completed for incomplete task', async ({
    page,
    workViewPage,
  }) => {
    await addAndOpenIncompleteTask(workViewPage, page);

    await expect(findTaskDetailItem(page, 'Completed', false)).toHaveCount(0);
  });

  test('should show completed for complete task', async ({ page, workViewPage }) => {
    await addAndOpenCompleteTask(workViewPage, page);

    await expect(findTaskDetailItem(page, 'Completed')).toHaveCount(1);
  });

  test('should update created with a date change', async ({ page, workViewPage }) => {
    await addAndOpenIncompleteTask(workViewPage, page);

    const createdItem = await findTaskDetailItem(page, 'Created');
    const createdItemText = await createdItem.textContent();
    await createdItem.click();

    await page.getByRole('button', { name: 'Open calendar' }).click();
    await page.getByRole('button', { name: 'Next month' }).click();
    // Picking the first day of the next month should guarantee a change
    await page.locator('mat-month-view button').first().click();
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(createdItem).not.toHaveText(createdItemText!);
  });

  test('should update created with a time change', async ({ page, workViewPage }) => {
    await addAndOpenIncompleteTask(workViewPage, page);

    const createdItem = await findTaskDetailItem(page, 'Created');
    const createdItemText = await createdItem.textContent();
    await createdItem.click();

    const timeInput = await page.getByRole('combobox', { name: 'Time' });
    let timeInputText = await timeInput.inputValue();
    // Flipping the meridiem should guarantee a change
    timeInputText = timeInputText!.replace(/([AP])/, (_, c) => (c === 'A' ? 'P' : 'A'));
    await timeInput.fill(timeInputText);
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(createdItem).not.toHaveText(createdItemText!);
  });

  test('should update completed with a date change', async ({ page, workViewPage }) => {
    await addAndOpenCompleteTask(workViewPage, page);

    const completedItem = await findTaskDetailItem(page, 'Completed');
    const completedItemText = await completedItem.textContent();
    await completedItem.click();

    await page.getByRole('button', { name: 'Open calendar' }).click();
    await page.getByRole('button', { name: 'Next month' }).click();
    // Picking the first day of the next month should guarantee a change
    await page.locator('mat-month-view button').first().click();
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(completedItem).not.toHaveText(completedItemText!);
  });

  test('should update completed with a time change', async ({ page, workViewPage }) => {
    await addAndOpenCompleteTask(workViewPage, page);

    const completedItem = await findTaskDetailItem(page, 'Completed');
    const completedItemText = await completedItem.textContent();
    await completedItem.click();

    const timeInput = await page.getByRole('combobox', { name: 'Time' });
    let timeInputText = await timeInput.inputValue();
    // Flipping the meridiem should guarantee a change
    timeInputText = timeInputText!.replace(/([AP])/, (_, c) => (c === 'A' ? 'P' : 'A'));
    await timeInput.fill(timeInputText);
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(completedItem).not.toHaveText(completedItemText!);
  });

  test('should prevent updating created with no datetime selection', async ({
    page,
    workViewPage,
  }) => {
    await addAndOpenIncompleteTask(workViewPage, page);

    await findTaskDetailItem(page, 'Created').click();

    await page.getByRole('textbox', { name: 'Date' }).fill('');
    await page.getByRole('combobox', { name: 'Time' }).fill('');

    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  test('should prevent updating completed with no datetime selection', async ({
    page,
    workViewPage,
  }) => {
    await addAndOpenCompleteTask(workViewPage, page);

    await findTaskDetailItem(page, 'Completed').click();

    await page.getByRole('textbox', { name: 'Date' }).fill('');
    await page.getByRole('combobox', { name: 'Time' }).fill('');

    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});

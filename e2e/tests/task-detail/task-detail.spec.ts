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

  const findDateInfo = (page: Page, infoPrefix: string): Locator =>
    page.locator('.edit-date-info').filter({ hasText: new RegExp(infoPrefix) });

  test('should update created with a time change', async ({ page, workViewPage }) => {
    await addAndOpenIncompleteTask(workViewPage, page);

    const createdInfo = await findDateInfo(page, 'Created');
    const createdInfoText = await createdInfo.textContent();
    await createdInfo.click();

    const timeInput = await page.getByRole('combobox', { name: 'Time' });
    let timeInputText = await timeInput.inputValue();
    // Flipping the meridiem should guarantee a change
    timeInputText = timeInputText!.replace(/([AP])/, (_, c) => (c === 'A' ? 'P' : 'A'));
    await timeInput.fill(timeInputText);
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(createdInfo).not.toHaveText(createdInfoText!);
  });

  test('should update completed with a date change', async ({ page, workViewPage }) => {
    await addAndOpenCompleteTask(workViewPage, page);

    const completedInfo = await findDateInfo(page, 'Completed');
    const completedInfoText = await completedInfo.textContent();
    await completedInfo.click();

    await page.getByRole('button', { name: 'Open calendar' }).click();
    await page.getByRole('button', { name: 'Next month' }).click();
    // Picking the first day of the next month should guarantee a change
    await page.locator('mat-month-view button').first().click();
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(completedInfo).not.toHaveText(completedInfoText!);
  });

  test('should update completed with a time change', async ({ page, workViewPage }) => {
    await addAndOpenCompleteTask(workViewPage, page);

    const completedInfo = await findDateInfo(page, 'Completed');
    const completedInfoText = await completedInfo.textContent();
    await completedInfo.click();

    const timeInput = await page.getByRole('combobox', { name: 'Time' });
    let timeInputText = await timeInput.inputValue();
    // Flipping the meridiem should guarantee a change
    timeInputText = timeInputText!.replace(/([AP])/, (_, c) => (c === 'A' ? 'P' : 'A'));
    await timeInput.fill(timeInputText);
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(completedInfo).not.toHaveText(completedInfoText!);
  });

  test('should prevent updating created with no datetime selection', async ({
    page,
    workViewPage,
  }) => {
    await addAndOpenIncompleteTask(workViewPage, page);

    await findDateInfo(page, 'Created').click();

    await page.getByRole('textbox', { name: 'Date' }).fill('');
    await page.getByRole('combobox', { name: 'Time' }).fill('');

    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  test('should prevent updating completed with no datetime selection', async ({
    page,
    workViewPage,
  }) => {
    await addAndOpenCompleteTask(workViewPage, page);

    await findDateInfo(page, 'Completed').click();

    await page.getByRole('textbox', { name: 'Date' }).fill('');
    await page.getByRole('combobox', { name: 'Time' }).fill('');

    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});

import { Page } from 'playwright/test';

import { expect, test } from '../../fixtures/test.fixture';

test.describe('Default task reminder option', () => {
  test.use({ locale: 'en-US', timezoneId: 'UTC' });

  // Should match the option set inside the default global configuration
  const defaultOptionText = 'when it starts';
  // Any other option different to the default to test the settings change
  const changedOptionText = 'never';

  const changeDefaultTaskReminderOption = async (page: Page): Promise<void> => {
    await page.getByRole('menuitem', { name: 'Settings' }).click();
    const remindersSection = await page.locator('section', { hasText: 'Reminders' });
    await remindersSection.click();

    // Should match the option set inside the default global configuration
    const selectedOption = remindersSection.getByText(defaultOptionText);
    await expect(selectedOption).toBeVisible();

    // Change it to another option to check whether the setting takes effect
    // across other application areas where a reminder option can be chosen
    await selectedOption.click();
    await page.getByText(changedOptionText).click();
  };

  test('should apply when scheduling a task using the due action', async ({
    page,
    waitForNav,
  }) => {
    await waitForNav();
    await changeDefaultTaskReminderOption(page);

    await page.getByRole('menuitem', { name: 'Inbox' }).click();
    await page.getByRole('button', { name: 'Due' }).click();
    // Click on the time input to reveal the reminder input
    await page.getByText('Time', { exact: true }).click();

    await expect(page.getByText(changedOptionText)).toBeVisible();
  });

  test('should apply when scheduling a task using short syntax', async ({
    page,
    waitForNav,
  }) => {
    await waitForNav();
    await changeDefaultTaskReminderOption(page);

    await page.getByRole('menuitem', { name: 'Inbox' }).click();
    const addTaskInput = await page.locator('.input-section input');
    await addTaskInput.fill('due task @at 1pm');
    await addTaskInput.press('Enter');
    await page.getByTitle('Reschedule').click();

    await expect(page.getByText(changedOptionText)).toBeVisible();
  });

  test('should apply when scheduling a task via the week schedule view', async ({
    page,
    waitForNav,
  }) => {
    await waitForNav();
    await changeDefaultTaskReminderOption(page);

    await page.getByRole('menuitem', { name: 'Schedule' }).click();
    // Dismiss the scheduling information dialog
    await page.locator('button', { hasText: /Cancel/ }).click();
    // Click somewhere during the final day column to create a placeholder task
    await page.locator('schedule-week [data-day]').last().click();
    const taskInput = page.getByPlaceholder('Schedule task...');
    await taskInput.fill('task');
    await taskInput.press('Enter');
    // Click the scheduled task to reveal the details panel
    await page.locator('schedule-event').click();
    await page.locator('task-detail-item', { hasText: 'Planned at' }).click();

    await expect(page.getByText(changedOptionText)).toBeVisible();
  });
});

import { expect, test } from '../../fixtures/test.fixture';

test.describe('Reminders Settings', () => {
  test.use({ locale: 'en-US', timezoneId: 'UTC' });

  test('should pre-fill new task reminder option from settings', async ({
    page,
    waitForNav,
  }) => {
    await waitForNav();

    await page.getByRole('menuitem', { name: 'Inbox' }).click();
    await page.getByRole('button', { name: 'Due' }).click();
    // Click on the time input to reveal the reminder input
    await page.getByText(/Time/).click();

    // Check the default task reminder setting is in effect
    await expect(page.getByText(/when it starts/)).toBeVisible();

    await page.getByText(/Cancel/).click();

    // Change the default task reminder setting
    await page.getByRole('menuitem', { name: 'Settings' }).click();
    await page.getByText(/Reminders/).click();
    await page.getByText(/when it starts/).click();
    await page.getByText(/10 minutes before it starts/).click();

    await page.getByRole('menuitem', { name: 'Inbox' }).click();
    await page.getByRole('button', { name: 'Due' }).click();
    // Click on the time input to reveal the reminder input
    await page.getByText(/Time/).click();

    // Check the new default task reminder setting is in effect
    await expect(page.getByText(/10 minutes before it starts/)).toBeVisible();
  });
});

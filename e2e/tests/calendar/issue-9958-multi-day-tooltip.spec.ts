import { expect, test } from '../../fixtures/test.fixture';

// Synthetic timed event matching the reported 31h duration, not the missing
// reporter workshop VEVENT. Feed interception retains the real iCal parser,
// provider integration, Schedule mapping and rendered browser title.
test('calendar #9958 multi-day segments use valid end hours', async ({
  page,
  workViewPage,
}, testInfo) => {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(10, 0, 0, 0);
  const duration = 31 * 60 * 60 * 1000;
  const end = new Date(start.getTime() + duration);
  const asIcal = (date: Date): string =>
    date.toISOString().replace(/[-:]/g, '').replace('.000', '');
  const feed = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SP issue 9958 reproduction//EN',
    'BEGIN:VEVENT',
    'UID:issue-9958-synthetic-workshop',
    `DTSTART:${asIcal(start)}`,
    `DTEND:${asIcal(end)}`,
    'SUMMARY:E2E 9958 workshop',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  await testInfo.attach('input.ics', { body: feed, contentType: 'text/calendar' });
  const url = 'https://example.com/issue-9958.ics';
  await page.route(url, (route) =>
    route.fulfill({ status: 200, contentType: 'text/calendar', body: feed }),
  );
  await workViewPage.waitForTaskList();
  await page.locator('.e2e-toggle-issue-provider-panel').click();
  await page.locator('mat-tab-group .mat-mdc-tab:last-child').click();
  await page.getByRole('button', { name: 'Other (iCal)' }).click();
  const dialog = page.locator('mat-dialog-container');
  await dialog.locator('input[id*="icalUrl"]').fill(url);
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog).toBeHidden();
  await page.keyboard.press('Escape');
  await page.getByRole('menuitem', { name: 'Schedule' }).click();
  await page.getByRole('button', { name: 'View Week' }).click();
  const events = page.locator('schedule-event').filter({ hasText: 'E2E 9958 workshop' });
  await expect(events).toHaveCount(2);
  const segments = await events.evaluateAll((elements) =>
    elements.map((el) => ({
      title: el.getAttribute('title'),
      day: el.closest('[data-day]')?.getAttribute('data-day'),
    })),
  );
  await testInfo.attach('segments.json', {
    body: JSON.stringify(segments, null, 2),
    contentType: 'application/json',
  });
  expect(segments.map((segment) => segment.title)).not.toEqual(
    expect.arrayContaining([expect.stringMatching(/(?:31|41):00/)]),
  );
});

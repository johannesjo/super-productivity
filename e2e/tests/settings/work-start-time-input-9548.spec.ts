import { expect, test } from '../../fixtures/test.fixture';
import type { Page } from '@playwright/test';

/**
 * #9548: typing `18` into the "Work Day Start" hour segment produced `08`.
 *
 * The config form binds `[model]="cfg()"`, so a field that commits on every
 * keystroke round-trips through the store and hands formly a fresh model
 * object, which rebuilds the field mid-edit and drops the native time
 * control's in-progress editing state — the first digit is lost. This drives
 * the real settings UI because none of that path (store -> signal -> formly
 * rebuild) exists in a component harness, and the native `<input type="time">`
 * segment state only reacts to real key events, not `fill()`.
 */

const SECTION = '.section-schedule';
const WORK_START_INPUT = `${SECTION} input[type=time]`;

const openScheduleSection = async (page: Page): Promise<void> => {
  await page.goto('/#/config?tab=2');
  await page.waitForURL(/config/);

  const collapsible = page.locator(`${SECTION} collapsible`);
  await collapsible.waitFor({ state: 'visible', timeout: 20000 });
  await collapsible.scrollIntoViewIfNeeded();

  const isExpanded = await collapsible.evaluate((el: Element) =>
    el.classList.contains('isExpanded'),
  );
  if (!isExpanded) {
    await collapsible.locator('.collapsible-header').click();
    await collapsible
      .locator('.collapsible-panel')
      .waitFor({ state: 'visible', timeout: 5000 });
  }
};

/** The work start/end times are hidden behind their own toggle. */
const enableWorkStartEnd = async (page: Page): Promise<void> => {
  const toggle = page
    .locator(`${SECTION} mat-slide-toggle, ${SECTION} mat-checkbox`)
    .first();
  await toggle.scrollIntoViewIfNeeded();
  const classes = (await toggle.getAttribute('class')) ?? '';
  if (!classes.includes('checked')) {
    await toggle.click();
  }
  await page.locator(WORK_START_INPUT).first().waitFor({ state: 'visible' });
};

test.describe('Schedule: work day start time input (#9548)', () => {
  test('should keep both hour digits while typing', async ({ page, workViewPage }) => {
    await workViewPage.waitForTaskList();
    await openScheduleSection(page);
    await enableWorkStartEnd(page);

    const input = page.locator(WORK_START_INPUT).first();
    await input.click();

    // Typed one key at a time on purpose: the bug only appears between
    // keystrokes, so `fill('18:30')` would pass against the broken build.
    await page.keyboard.press('1');
    await page.keyboard.press('8');
    // Chrome auto-advances to the minute segment after two hour digits.
    await page.keyboard.press('3');
    await page.keyboard.press('0');

    await expect(input).toHaveValue('18:30');
  });

  test('should persist the typed time across a reload', async ({
    page,
    workViewPage,
  }) => {
    await workViewPage.waitForTaskList();
    await openScheduleSection(page);
    await enableWorkStartEnd(page);

    const input = page.locator(WORK_START_INPUT).first();
    await input.click();
    for (const key of ['1', '8', '3', '0']) {
      await page.keyboard.press(key);
    }
    // The field is `updateOn: 'blur'` — the value only reaches the form on blur.
    await input.blur();
    // The save snack confirms the store commit; the write to IndexedDB behind
    // it is async, so the re-read below still retries.
    await expect(page.locator('mat-snack-bar-container')).toBeVisible({
      timeout: 10000,
    });

    await expect(async () => {
      await page.reload();
      await openScheduleSection(page);
      await enableWorkStartEnd(page);
      await expect(page.locator(WORK_START_INPUT).first()).toHaveValue('18:30');
    }).toPass({ timeout: 45000 });
  });
});

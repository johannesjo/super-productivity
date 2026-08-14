import { Page } from 'playwright/test';

import { expect, test } from '../../fixtures/test.fixture';

/**
 * Issues #9415, #9551, #9556: on iOS, tapping the tag field in a task's detail
 * panel zoomed the whole page and left the tag autocomplete misaligned.
 *
 * iOS zooms the page whenever the focused form control's computed font-size is
 * below 16px, and only restores the scale on blur. That was suppressed app-wide
 * by `user-scalable=no` in the viewport meta until #9272 deliberately dropped it
 * to restore pinch-zoom (shipped in v18.16.0) — which surfaced the zoom on every
 * bare input that is not inside a mat-form-field (those resolve to 16px via
 * --mat-form-field-container-text-size).
 *
 * The zoom itself is a WebKit behavior and cannot be reproduced in Chromium, so
 * this pins the invariant it keys off instead: every focusable text control in
 * the detail panel must compute to >= 16px. That is exactly what regressed, and
 * it fails against the pre-fix stylesheet (tag input: ~13px UA default,
 * add-subtask input: 14px).
 *
 * Run: npm run e2e:file e2e/tests/task-detail/ios-focus-zoom-9556.spec.ts -- --retries=0
 */

const IOS_ZOOM_THRESHOLD_PX = 16;

const getFontSizePx = async (page: Page, selector: string): Promise<number> => {
  const raw = await page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).fontSize);
  return parseFloat(raw);
};

test.describe('Task detail iOS focus zoom', () => {
  test('should keep detail panel inputs at or above the iOS zoom threshold', async ({
    page,
    workViewPage,
    taskPage,
  }) => {
    await workViewPage.waitForTaskList();
    await workViewPage.addTask('zoom threshold task');

    const task = taskPage.getTaskByText('zoom threshold task');
    await task.hover();
    await page.getByRole('button', { name: 'Show/hide task panel' }).click();

    // Tag field — the control all three issues named.
    const tagInput = page.locator('tag-edit input');
    await tagInput.waitFor({ state: 'visible' });
    expect(await getFontSizePx(page, 'tag-edit input')).toBeGreaterThanOrEqual(
      IOS_ZOOM_THRESHOLD_PX,
    );

    // Add-subtask field — same panel, same gesture, same defect.
    await task.focus();
    await task.press('a');
    const subTaskInput = page.locator('.e2e-add-subtask-input');
    await subTaskInput.waitFor({ state: 'visible' });
    expect(await getFontSizePx(page, '.e2e-add-subtask-input')).toBeGreaterThanOrEqual(
      IOS_ZOOM_THRESHOLD_PX,
    );

    // The panel title is deliberately not asserted here. `.task-title` is 17px
    // and only drops to 15px at mq(xs) — which is `min-width`, so phones keep
    // 17px and never triggered the zoom. Measured at a 390px viewport to
    // confirm. Asserting it needs a viewport resize mid-test, which reports
    // transitional values before the layout settles, so it was dropped rather
    // than shipped flaky.
  });
});

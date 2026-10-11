import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../fixtures/test.fixture';
import { waitForAngularStability } from '../../utils/waits';

const openDayPanelInBottomSheet = async (page: Page): Promise<Locator> => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/tag/TODAY/tasks');
  await waitForAngularStability(page);

  await page.getByRole('button', { name: 'Side Panel Menu' }).click();
  await page.locator('.e2e-toggle-schedule-day-panel').click();

  const dayPanel = page.locator('bottom-panel-container schedule-day-panel');
  await expect(dayPanel).toBeVisible();
  return dayPanel;
};

// Fast horizontal touch swipe, as SwipeDirective detects it.
const swipe = async (target: Locator, deltaX: number): Promise<void> => {
  await target.evaluate((el, dx) => {
    const rect = el.getBoundingClientRect();
    const x = (rect.left + rect.right) / 2;
    const y = (rect.top + rect.bottom) / 2;
    const touchAt = (clientX: number): Touch =>
      new Touch({ identifier: 1, target: el, clientX, clientY: y });
    el.dispatchEvent(
      new TouchEvent('touchstart', {
        bubbles: true,
        touches: [touchAt(x)],
        changedTouches: [touchAt(x)],
      }),
    );
    el.dispatchEvent(
      new TouchEvent('touchend', {
        bubbles: true,
        touches: [],
        changedTouches: [touchAt(x + dx)],
      }),
    );
  }, deltaX);
};

const dayStr = (deltaDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + deltaDays);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

// Below 600px the right panel is replaced by a bottom sheet; the schedule day
// panel must render there too (it used to open an empty sheet).
test.describe('Schedule day panel on mobile', () => {
  test('renders today inside the bottom sheet, scrolled to now', async ({ page }) => {
    const dayPanel = await openDayPanelInBottomSheet(page);
    await expect(dayPanel.locator('schedule-week .grid-container')).toBeVisible();

    const currentTime = dayPanel.locator('.current-time');
    await expect(currentTime).toBeAttached();
    await expect
      .poll(async () => {
        const panelBox = await dayPanel.boundingBox();
        const nowBox = await currentTime.boundingBox();
        if (!panelBox || !nowBox) return false;
        return nowBox.y >= panelBox.y && nowBox.y <= panelBox.y + panelBox.height;
      })
      .toBe(true);
  });

  test('keeps the date visible and navigates days by button and swipe', async ({
    page,
  }) => {
    const dayPanel = await openDayPanelInBottomSheet(page);
    const header = dayPanel.locator('.week-header');
    const col = dayPanel.locator('.grid-container .col').first();
    const prevBtn = dayPanel.getByRole('button', { name: 'Previous Day' });
    const nextBtn = dayPanel.getByRole('button', { name: 'Next Day' });

    // The panel opens scrolled to now; the sticky date must stay in view.
    await expect(dayPanel.locator('.current-time')).toBeInViewport();
    await expect(header).toBeInViewport();
    await expect(col).toHaveAttribute('data-day', dayStr(0));
    await expect(prevBtn).toBeDisabled();

    await nextBtn.click();
    await expect(col).toHaveAttribute('data-day', dayStr(1));
    await expect(dayPanel.locator('.current-time')).toHaveCount(0);

    const dropZone = dayPanel.locator('.schedule-day-drop-zone');
    await swipe(dropZone, -150);
    await expect(col).toHaveAttribute('data-day', dayStr(2));

    await swipe(dropZone, 150);
    await expect(col).toHaveAttribute('data-day', dayStr(1));
    await prevBtn.click();
    await expect(col).toHaveAttribute('data-day', dayStr(0));

    // Never navigates into the past.
    await swipe(dropZone, 150);
    await expect(col).toHaveAttribute('data-day', dayStr(0));
    await expect(header).toBeInViewport();
  });
});

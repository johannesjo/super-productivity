import { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/test.fixture';

type Frame = {
  elapsed: number;
  top: number;
  height: number;
  transform: string;
  inlineTransform: string;
  animations: { state: string; fill: FillMode; name: string }[];
};
type Motion = { frames: Frame[]; removedAt: number | null };
type MotionWindow = Window & { bottomPanelMotion: Promise<Motion> };

const openPanel = async (page: Page, panel = 'notes'): Promise<void> => {
  await page.getByRole('button', { name: 'Side Panel Menu' }).click();
  await page
    .locator(
      panel === 'notes' ? '.e2e-toggle-notes-btn' : '.e2e-toggle-schedule-day-panel',
    )
    .click();
  const sheet = page.locator('mat-bottom-sheet-container');
  await expect(
    sheet.locator(panel === 'notes' ? 'notes' : 'schedule-day-panel'),
  ).toBeVisible();
  // Wait for real entrance animations, retaining their actual fill effects.
  await sheet.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
};

const recordRelease = async (page: Page): Promise<void> => {
  await page.locator('mat-bottom-sheet-container').evaluate((element) => {
    (window as MotionWindow).bottomPanelMotion = new Promise<Motion>((resolve) => {
      document.addEventListener(
        'pointerup',
        () => {
          const start = performance.now();
          const frames: Frame[] = [];
          const sample = (): void => {
            const elapsed = performance.now() - start;
            if (!element.isConnected || elapsed > 1000) {
              resolve({ frames, removedAt: element.isConnected ? null : elapsed });
              return;
            }
            const box = element.getBoundingClientRect();
            frames.push({
              elapsed,
              top: box.top,
              height: box.height,
              transform: getComputedStyle(element).transform,
              inlineTransform: (element as HTMLElement).style.transform,
              animations: element.getAnimations().map((animation) => ({
                state: animation.playState,
                fill: animation.effect!.getTiming().fill,
                name:
                  animation instanceof CSSAnimation
                    ? animation.animationName
                    : 'transition',
              })),
            });
            requestAnimationFrame(sample);
          };
          sample();
        },
        { once: true, capture: true },
      );
    });
  });
};

const drag = async (page: Page, distance = 120): Promise<void> => {
  const box = await page.locator('.bottom-panel-header').boundingBox();
  expect(box).not.toBeNull();
  const halfWidth = box!.width / 2;
  const halfHeight = box!.height / 2;
  const x = box!.x + halfWidth;
  const y = box!.y + halfHeight;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= 6; step++) {
    // A measured fling, not instantaneous synthetic pointer events.
    await page.waitForTimeout(16);
    const offset = (distance * step) / 6;
    await page.mouse.move(x, y + offset);
  }
};

const expectContinuousDismissal = async (page: Page): Promise<void> => {
  const motion = await page.evaluate(() => (window as MotionWindow).bottomPanelMotion);
  await test.info().attach('release-motion', {
    body: JSON.stringify(motion, null, 2),
    contentType: 'application/json',
  });
  expect(motion.removedAt, 'sheet should eventually dismiss').not.toBeNull();
  const initial = motion.frames[0];
  const earlyFrames = motion.frames.filter(
    (frame) => frame.elapsed >= 50 && frame.elapsed <= 150,
  );
  expect(earlyFrames.length, 'must observe frames shortly after release').toBeGreaterThan(
    1,
  );
  // Allow several frames of scheduling tolerance; a 150ms plateau is perceptible.
  expect(
    Math.max(...earlyFrames.map((frame) => frame.top - initial.top)),
    'sheet should keep moving down after release, without a stationary pause',
  ).toBeGreaterThan(10);
};

test.describe('Mobile bottom panel dismissal', () => {
  test.use({ contextOptions: { viewport: { width: 390, height: 844 } } });

  for (const panel of ['notes', 'schedule']) {
    test(`${panel} continues moving immediately after a downward fling`, async ({
      page,
    }) => {
      await openPanel(page, panel);
      await recordRelease(page);
      await drag(page);
      await page.mouse.up();
      await expectContinuousDismissal(page);
    });
  }

  test('backdrop dismissal starts moving promptly', async ({ page }) => {
    await openPanel(page);
    await recordRelease(page);
    await page.mouse.click(20, 20);
    await expectContinuousDismissal(page);
  });

  for (const gesture of ['hold', 'short']) {
    test(`${gesture} drag retains the resized panel`, async ({ page }) => {
      await openPanel(page);
      const sheet = page.locator('mat-bottom-sheet-container');
      const initial = await sheet.boundingBox();
      await drag(page, gesture === 'hold' ? 120 : 12);
      // Holding must clear the last fling velocity before lifting.
      if (gesture === 'hold') await page.waitForTimeout(100);
      await page.mouse.up();
      // Outlast both possible close animations to prove the sheet remains open.
      await page.waitForTimeout(700);
      await expect(sheet).toBeVisible();
      const resized = await sheet.boundingBox();
      expect(resized!.height).toBeCloseTo(
        initial!.height - (gesture === 'hold' ? 120 : 12),
        0,
      );
      await expect(sheet).not.toHaveClass(/dragging|closing/);
    });
  }
});

import { expect, test } from '../../fixtures/test.fixture';
import type { Page } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 390, height: 844 };
// The global add-task button only exists in the wide layout, so tasks are seeded at
// this size and the viewport shrinks to a phone before the schedule is touched.
const SETUP_VIEWPORT = { width: 1024, height: 900 };
const SCROLL_WRAPPER = 'schedule .scroll-wrapper';
// Mirrors DRAG_DELAY_FOR_TOUCH in src/app/app.constants.ts. E2E does not import from
// src, so if the source value ever rises above the hold below, the long-press test
// fails on its final assertion — the drag never starts.
const DRAG_DELAY_FOR_TOUCH = 500;
const DRAG_STEP_PX = 15;

type TouchDriver = {
  move: (x: number, y: number) => Promise<void>;
  start: (x: number, y: number) => Promise<void>;
  end: () => Promise<void>;
  detach: () => Promise<void>;
};

/**
 * Real touch input via CDP. Synthetic TouchEvents never produce native scrolling, so
 * they cannot tell "the page scrolled" apart from "nothing happened".
 */
const touchDriver = async (page: Page): Promise<TouchDriver> => {
  const cdp = await page.context().newCDPSession(page);
  const send = (type: string, points: { x: number; y: number }[]): Promise<unknown> =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points } as never);

  return {
    start: (x, y) => send('touchStart', [{ x, y }]) as Promise<void>,
    move: (x, y) => send('touchMove', [{ x, y }]) as Promise<void>,
    end: () => send('touchEnd', []) as Promise<void>,
    detach: () => cdp.detach(),
  };
};

/**
 * Seed a task, then open the schedule as a phone would.
 *
 * The reload matters: input intent is per-session and Playwright seeds tasks with real
 * mouse clicks, which legitimately flips the app to mouse intent. A hash navigation
 * would keep that state, so the reload restores the touch-primary bootstrap a phone
 * actually gets — without it, `dragDelayForTouch()` is the mouse value of 0 and the
 * test proves nothing.
 */
const seedTaskAndOpenSchedule = async (
  page: Page,
  workViewPage: {
    waitForTaskList: () => Promise<void>;
    addTask: (t: string) => Promise<void>;
  },
  taskTitle: string,
): Promise<void> => {
  await workViewPage.waitForTaskList();
  await workViewPage.addTask(taskTitle);

  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto('/#/schedule');
  await page.reload();
  await expect(page.locator('schedule-week')).toBeVisible();
};

test.describe('Schedule touch scrolling (#9675)', () => {
  // isMobile makes Chromium report `pointer: coarse`, which is what puts detect-it in
  // touchOnly mode and InputIntentService in 'touch' intent from bootstrap.
  test.use({
    viewport: SETUP_VIEWPORT,
    hasTouch: true,
    isMobile: true,
  });

  test('a deliberate swipe over a task scrolls instead of moving it', async ({
    page,
    workViewPage,
  }) => {
    await seedTaskAndOpenSchedule(page, workViewPage, 'Touch scroll task /3h/');

    const scrollWrapper = page.locator(SCROLL_WRAPPER);
    const event = page.locator('schedule-event').filter({ hasText: 'Touch scroll task' });
    await expect(event).toBeVisible();

    // grid-row encodes both the start row and the span, so one comparison catches a
    // task that was moved to another time AND one whose duration was resized.
    const styleBefore = await event.getAttribute('style');
    const scrollBefore = await scrollWrapper.evaluate((el) => el.scrollTop);

    const box = await event.boundingBox();
    expect(box).not.toBeNull();
    const halfWidth = box!.width / 2;
    const halfHeight = box!.height / 2;
    const x = box!.x + halfWidth;
    const y = box!.y + halfHeight;

    const touch = await touchDriver(page);
    await touch.start(x, y);

    // Creep below CDK's 5px threshold for ~120ms. CDK only decides scroll-vs-drag at
    // the moment the threshold is crossed: if the drag start delay has elapsed by then
    // it drags, otherwise it abandons the sequence and the browser keeps the scroll.
    // This is what a slow, deliberate swipe looks like, and it is why the old 75ms
    // delay moved the task while the app-wide 500ms long press does not.
    for (let i = 1; i <= 4; i++) {
      await page.waitForTimeout(30);
      await touch.move(x, y - i);
    }

    // first move past the threshold — the decision point
    await page.waitForTimeout(15);
    await touch.move(x, y - 30);

    for (let i = 2; i <= 8; i++) {
      await page.waitForTimeout(15);
      const step = i * 20;
      const travelled = 30 + step;
      await touch.move(x, y - travelled);
    }
    await touch.end();
    await touch.detach();

    // With the drag delay too short, the swipe is consumed as a task move: the
    // schedule does not scroll and the task lands on a different grid row.
    await expect
      .poll(() => scrollWrapper.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(scrollBefore);
    expect(await event.getAttribute('style')).toBe(styleBefore);
  });

  test('the resize handle is not rendered while touch is the active input', async ({
    page,
    workViewPage,
  }) => {
    await seedTaskAndOpenSchedule(page, workViewPage, 'Touch resize task /2h/');

    const event = page.locator('schedule-event').filter({ hasText: 'Touch resize task' });
    await expect(event).toBeVisible();

    // The handle is a 12px band on the bottom edge of every event — unhittable on
    // purpose with a finger, but easy to hit by accident, which is how a scroll swipe
    // became a duration change.
    await expect(event.locator('.resize-handle')).toHaveCount(0);
  });

  // The counterpart of the swipe test: raising the delay must not have traded an
  // unscrollable schedule for an unmovable task. This one passes on the pre-fix tree
  // too — it is a regression guard for the positive path, not a reproduction.
  test('a long press still moves a task to a new time', async ({
    page,
    workViewPage,
  }) => {
    await seedTaskAndOpenSchedule(page, workViewPage, 'Touch drag task /1h/');

    // While a drag is live, CDK's clone is a second schedule-event with the same text.
    const event = page
      .locator('schedule-event:not(.custom-drag-preview)')
      .filter({ hasText: 'Touch drag task' });
    await expect(event).toBeVisible();

    // grid-row encodes the start row, so a changed style means the task landed on a
    // different time. Scrolling alone never changes it.
    const styleBefore = await event.getAttribute('style');

    const box = await event.boundingBox();
    expect(box).not.toBeNull();
    const halfWidth = box!.width / 2;
    const halfHeight = box!.height / 2;
    const x = box!.x + halfWidth;
    const y = box!.y + halfHeight;

    const touch = await touchDriver(page);
    await touch.start(x, y);

    // Hold still past DRAG_DELAY_FOR_TOUCH before crossing CDK's 5px threshold. CDK
    // decides scroll-vs-drag at the crossing, so with the delay already elapsed the
    // same movement that scrolls in the test above must drag here.
    await page.waitForTimeout(DRAG_DELAY_FOR_TOUCH + 200);

    for (let i = 1; i <= 8; i++) {
      const travelled = i * DRAG_STEP_PX;
      await touch.move(x, y + travelled);
      await page.waitForTimeout(15);
    }
    await touch.end();
    await touch.detach();

    await expect(event).not.toHaveClass(/cdk-drag-dragging/);
    await expect.poll(() => event.getAttribute('style')).not.toBe(styleBefore);
  });
});

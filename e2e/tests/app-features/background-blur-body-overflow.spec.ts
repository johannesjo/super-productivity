import { expect, test } from '../../fixtures/test.fixture';

/**
 * Bug: `.bg-image` (app.component.scss) is `position: absolute` relative to
 * `body` (page.scss: `body { position: absolute }`), and gets
 * `transform: scale(1.12)` when blurred (`.is-blurred`). That doesn't change
 * its layout size, but it does expand its *painted* bounds -- and a
 * transformed descendant's painted bounds count toward its containing
 * block's scrollable-overflow region. `.app-container` (the next element
 * down) has `overflow: visible`, so that overflow isn't clipped there and
 * bubbles up to `body`, which is `overflow: hidden` but still ends up with
 * real, permanent scrollable overflow the entire time a blurred background
 * is active -- independent of any route or animation.
 *
 * This is silent on its own, but any `scrollIntoView()` call anywhere in the
 * app whose ancestor walk reaches `body` (e.g. ScheduleComponent's
 * current-time anchor) can then nudge `body.scrollLeft`/`scrollTop`, and
 * since the overflow is a static style (not an animation), nothing ever
 * resets it back to 0 -- the app shell stays visibly shifted until restart.
 */
type StoreLike = {
  dispatch: (action: unknown) => void;
};

test.describe('Background image blur', () => {
  test('does not leave <body> with real scrollable overflow', async ({
    page,
    workViewPage,
  }) => {
    await workViewPage.waitForTaskList();

    await expect
      .poll(() =>
        page.evaluate(() => {
          const store = (
            window as unknown as { __e2eTestHelpers?: { store?: StoreLike } }
          ).__e2eTestHelpers?.store;
          if (!store) return false;
          store.dispatch({
            type: '[Global Config] Update Global Config Section',
            sectionKey: 'misc',
            sectionCfg: {
              backgroundImageLight: 'e2e-test-bg.png',
              backgroundImageDark: 'e2e-test-bg.png',
              backgroundImageBlur: 20,
            },
            isSkipSnack: true,
          });
          return true;
        }),
      )
      .toBe(true);

    // Wait for the blurred background to actually be in the DOM.
    await expect(page.locator('.bg-image.is-blurred')).toBeVisible();

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.body.clientWidth,
      scrollHeight: document.body.scrollHeight,
      clientHeight: document.body.clientHeight,
    }));

    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
    expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);
  });
});

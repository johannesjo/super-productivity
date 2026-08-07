import { type Locator, type Page } from '@playwright/test';

/**
 * Header actions that do not fit move into the overflow panel (#9480), which
 * stays mounted but is `opacity: 0; pointer-events: none; inert` until its
 * trigger is tapped.
 *
 * That state is the trap for a test: Playwright still reports the button as
 * *visible* (it has a layout box), so `expect(...).toBeVisible()` passes and
 * the click that follows lands on a node that cannot receive it — a 15s
 * actionability timeout with nothing pointing at the header layout as the
 * cause. Whether a given action is demoted depends on the header's own width,
 * which the side nav and the right panel both narrow, so it is not something a
 * viewport-size check can answer any more.
 *
 * Call this before interacting with any header action that can be demoted:
 * counters, sync, the panel toggles, plugin buttons, the user profile button.
 * It is a no-op while the action is inline.
 *
 * @param selector CSS for the action itself, e.g. `.sync-btn`.
 * @returns the action, wherever it currently lives.
 */
export const revealHeaderAction = async (
  page: Page,
  selector: string,
): Promise<Locator> => {
  const isDemoted =
    (await page.locator(`.header-overflow-panel ${selector}`).count()) > 0;
  const isPanelOpen =
    (await page.locator('.header-overflow-panel.isVisible').count()) > 0;
  if (isDemoted && !isPanelOpen) {
    await page.locator('.header-overflow-btn').click();
    await page
      .locator(`.header-overflow-panel.isVisible ${selector}`)
      .first()
      .waitFor({ state: 'visible', timeout: 5000 });
  }
  return page.locator(selector).first();
};

/**
 * Whether a header action has been demoted into the overflow panel. Useful
 * where a test needs to assert on placement rather than just reach the button.
 */
export const isHeaderActionDemoted = async (
  page: Page,
  selector: string,
): Promise<boolean> =>
  (await page.locator(`.header-overflow-panel ${selector}`).count()) > 0;

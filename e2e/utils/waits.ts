import { type Page } from '@playwright/test';

const DEFAULT_ROUTE_REGEX = /#\/(tag|project)\/.+\/tasks/;

type WaitForAppReadyOptions = {
  /**
   * Additional selector that should be visible before returning.
   */
  selector?: string;
  /**
   * Whether to wait for a work-view style route.
   */
  ensureRoute?: boolean;
  /**
   * Custom route regex if ensureRoute is enabled.
   */
  routeRegex?: RegExp;
};

/**
 * Wait until Angular reports stability or fall back to a DOM based heuristic.
 * Works for both dev and prod builds (where window.ng may be stripped).
 * Optimized for speed - reduced timeout and streamlined checks.
 */
export const waitForAngularStability = async (
  page: Page,
  timeout = 3000,
): Promise<void> => {
  await page.waitForFunction(
    () => {
      const win = window as unknown as {
        getAllAngularTestabilities?: () => Array<{ isStable: () => boolean }>;
      };

      // Primary check: Angular testability API
      const testabilities = win.getAllAngularTestabilities?.();
      if (testabilities && testabilities.length) {
        return testabilities.every((t) => {
          try {
            return t.isStable();
          } catch {
            return false;
          }
        });
      }

      // Fallback: DOM readiness
      return (
        document.readyState === 'complete' && !!document.querySelector('.route-wrapper')
      );
    },
    { timeout },
  );
};

/**
 * Shared helper to wait until the application shell and Angular are ready.
 * Optimized for speed - removed networkidle wait and redundant checks.
 */
export const waitForAppReady = async (
  page: Page,
  options: WaitForAppReadyOptions = {},
): Promise<void> => {
  const { selector, ensureRoute = true, routeRegex = DEFAULT_ROUTE_REGEX } = options;

  // Wait for initial page load
  await page.waitForLoadState('domcontentloaded');

  // Wait for route to match (if required)
  if (ensureRoute) {
    await page.waitForURL(routeRegex, { timeout: 10000 });
  }

  // Wait for main route wrapper to be visible (indicates app shell loaded)
  await page
    .locator('.route-wrapper')
    .first()
    .waitFor({ state: 'visible', timeout: 10000 });

  // Wait for optional selector
  if (selector) {
    await page.locator(selector).first().waitFor({ state: 'visible', timeout: 8000 });
  }

  // Wait for Angular to stabilize
  await waitForAngularStability(page);
};

/**
 * Wait for local state changes to persist before triggering sync.
 * This ensures IndexedDB writes have completed after UI state changes.
 * Optimized to rely on Angular stability rather than networkidle.
 */
export const waitForStatePersistence = async (page: Page): Promise<void> => {
  // Wait for Angular to become stable (async operations complete)
  await waitForAngularStability(page, 3000);
  // Small buffer for IndexedDB writes to complete
  await page.waitForTimeout(100);
};

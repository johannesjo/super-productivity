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
 */
export const waitForAngularStability = async (
  page: Page,
  timeout = 5000,
): Promise<void> => {
  await page
    .waitForFunction(
      () => {
        const win = window as unknown as {
          getAllAngularTestabilities?: () => Array<{ isStable: () => boolean }>;
          ng?: any;
        };

        const testabilities = win.getAllAngularTestabilities?.();
        if (testabilities && testabilities.length) {
          return testabilities.every((testability) => {
            try {
              return testability.isStable();
            } catch {
              return false;
            }
          });
        }

        const ng = win.ng;
        const appRef = ng
          ?.getComponent?.(document.body)
          ?.injector?.get?.(ng.core?.ApplicationRef);
        const manualStableFlag = appRef?.isStable;
        if (typeof manualStableFlag === 'boolean') {
          return manualStableFlag;
        }

        // As a final fallback, ensure the main shell exists & DOM settled.
        return (
          document.readyState === 'complete' &&
          !!document.querySelector('magic-side-nav') &&
          !!document.querySelector('.route-wrapper')
        );
      },
      { timeout },
    )
    .catch(() => {
      // Non-fatal: fall back to next waits
    });
};

/**
 * Shared helper to wait until the application shell and Angular are ready.
 */
export const waitForAppReady = async (
  page: Page,
  options: WaitForAppReadyOptions = {},
): Promise<void> => {
  const { selector, ensureRoute = true, routeRegex = DEFAULT_ROUTE_REGEX } = options;

  await page.waitForLoadState('domcontentloaded');
  await page
    .waitForSelector('body', { state: 'visible', timeout: 10000 })
    .catch(() => {});

  // Handle any blocking dialogs (pre-migration, confirmation, etc.)
  // These dialogs block app until dismissed
  for (let i = 0; i < 3; i++) {
    try {
      const dialogConfirmBtn = page.locator('dialog-confirm button[e2e="confirmBtn"]');
      await dialogConfirmBtn.waitFor({ state: 'visible', timeout: 2000 });
      await dialogConfirmBtn.click();
      await page.waitForTimeout(500);
    } catch {
      // No dialog visible, break out
      break;
    }
  }

  await page
    .waitForSelector('magic-side-nav', { state: 'visible', timeout: 15000 })
    .catch(() => {});

  if (ensureRoute) {
    await page.waitForURL(routeRegex, { timeout: 15000 }).catch(() => {});
  }

  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

  await page
    .locator('.route-wrapper')
    .first()
    .waitFor({ state: 'visible', timeout: 10000 })
    .catch(() => {});

  if (selector) {
    await page
      .waitForSelector(selector, { state: 'visible', timeout: 10000 })
      .catch(() => {});
  }

  await waitForAngularStability(page).catch(() => {});

  // Small buffer to ensure animations settle.
  await page.waitForTimeout(200);
};

/**
 * Wait for local state changes to persist before triggering sync.
 * This ensures IndexedDB writes have completed after UI state changes.
 * Uses Angular stability + networkidle as indicators that async operations have settled.
 */
export const waitForStatePersistence = async (page: Page): Promise<void> => {
  // Wait for Angular to become stable (async operations complete)
  await waitForAngularStability(page, 3000).catch(() => {});
  // Wait for any pending network requests to complete
  await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
};

import { expect, test } from '../../fixtures/test.fixture';

/**
 * Bug: https://github.com/super-productivity/super-productivity/issues/5358
 * (and the `#/schedule` variant in #4842)
 *
 * A malformed time in the *schedule config* (workStart / workEnd /
 * lunchBreakStart / lunchBreakEnd) makes getDateTimeFromClockString() throw
 * "Invalid clock string" the moment the Schedule renders, taking the whole
 * view down.
 *
 * The settings form validates, so such a value does not come from the UI --
 * it arrives verbatim from an import or a synced snapshot: `loadAllData`
 * spreads globalConfig over the defaults at the top level only, so unlike
 * misc/tasks/idle/... the `schedule` section gets no per-field defaulting,
 * and typia accepts '' for a `string` so autoFixTypiaErrors never repairs it.
 * `updateGlobalConfigSection` -- dispatched below, and the same action a
 * remote op replays -- takes a partial section with no validation at all.
 *
 * Expected: the Schedule renders without work-hours blocks (as when the
 *           feature is off), rather than crashing.
 */

const DESKTOP_VIEWPORT = { width: 1280, height: 720 };

/**
 * Dispatch straight into the in-memory NgRx store and read the resulting
 * schedule config back, so the test cannot silently pass on a no-op write.
 * Local e2e runs serve the dev build, so `ng.getComponent` is available (the
 * #7067 spec documents the production fallback of injecting an op into
 * IndexedDB; not needed here).
 */
const corruptScheduleCfg = async (
  page: import('@playwright/test').Page,
): Promise<string | null> =>
  page.evaluate((): string | null => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ng = (window as any).ng;
    if (!ng?.getComponent) return null;

    for (const el of Array.from(document.querySelectorAll('*'))) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const comp = ng.getComponent(el) as any;
        const store = comp?._store ?? comp?.store ?? comp?.__store;
        if (!store?.dispatch) continue;

        store.dispatch({
          type: '[Global Config] Update Global Config Section',
          sectionKey: 'schedule',
          sectionCfg: {
            isWorkStartEndEnabled: true,
            workStart: '',
            workEnd: '',
            isLunchBreakEnabled: true,
            lunchBreakStart: '',
            lunchBreakEnd: '',
          },
          meta: {},
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let state: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        store.subscribe((s: any) => (state = s)).unsubscribe();
        return state?.globalConfig?.schedule?.workStart ?? null;
      } catch {
        // keep scanning for a component that exposes the store
      }
    }
    return null;
  });

test.describe('Schedule with a corrupt schedule config (#5358)', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('renders the Schedule instead of throwing "Invalid clock string"', async ({
    page,
    workViewPage,
  }) => {
    await workViewPage.waitForTaskList();

    // At least one task is required: mapToScheduleDays early-returns [] when
    // tasks, scheduled tasks, repeat cfgs, calendar items and planner days are
    // ALL empty, so a clean profile never reaches the blocker-block code at
    // all. That is very likely why this was filed "unable to reproduce".
    await workViewPage.addTask('ScheduleCfgBug5358');

    // Both oracles below were verified to FAIL against the pre-fix commit:
    // the throw escapes the schedule computed, `schedule-week` never renders,
    // and the error surfaces as a pageerror. (An earlier version of this test
    // passed while broken because it had no task -- see addTask above.)
    const clockErrors: string[] = [];
    const record = (text: string): void => {
      if (text.includes('Invalid clock string')) clockErrors.push(text);
    };
    page.on('console', (m) => m.type() === 'error' && record(m.text()));
    page.on('pageerror', (e) => record(e.message));

    expect(await corruptScheduleCfg(page)).toBe('');

    await page.getByRole('menuitem', { name: 'Schedule' }).click();
    await expect(page.locator('schedule-week')).toBeVisible({ timeout: 10000 });

    // The view must actually be populated, not an empty shell left behind by a
    // swallowed error.
    await expect(
      page.locator('schedule-week .col:not(.end-of-day)[data-day]').first(),
    ).toBeVisible();

    expect(clockErrors).toEqual([]);
  });
});

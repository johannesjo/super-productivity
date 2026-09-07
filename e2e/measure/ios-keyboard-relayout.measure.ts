/**
 * Manual measurement harness for #9779 — "opening the add-task bar on iOS is
 * laggy, and it gets worse the more task rows are on screen".
 *
 * Not a test: it asserts only that its own setup worked, prints numbers, and
 * always passes. Run it by hand:
 *
 *   npx playwright test --config e2e/measure/playwright.measure.config.ts \
 *     --project=measure-webkit
 *
 * MEASURE_OPEN_TASK_COUNT / MEASURE_DONE_TASK_COUNT override the seeded list
 * (default 128 open + 73 done — the reporter's own Inbox).
 *
 * What it measures, and why each one is here:
 *
 * - `root-custom-property write` — `keyboardWillShow` sets `--keyboard-height`
 *   on `document.documentElement`, and `keyboardWillHide` resets it along with
 *   `--keyboard-overlay-offset` (`global-theme.service.ts`).
 * - `leaf-custom-property write` — the same write aimed at an element nothing
 *   inherits from. The pair is the measurement: it prices the #9809 treatment of
 *   `--visual-viewport-height` if applied to these two as well.
 * - `plain-property write` — a non-inherited property on the root. Weaker: it
 *   does NOT move the rows (the label says so), so it prices the write plus the
 *   forced rect read, not layout.
 * - `shell-height-write` — `iosShellHeight` writes a height on `.app-container`
 *   once per visualViewport resize while the keyboard animates.
 * - `resize-dispatch` — `_notifyIOSViewportChange` fires a synthetic window
 *   resize per animation frame, waking CdkTextareaAutosize and every connected
 *   CDK overlay's ViewportRuler.
 * - `add-task-bar-open` — tap on the mobile FAB to the input holding focus.
 *
 * Findings as of 2026-09 (WebKit 26, iPhone 13 viewport, `ng serve` build):
 *
 *                                   0 rows   201 rows   128 rows, done collapsed
 *   root-custom-property write        9.2ms    219.5ms                    121.9ms
 *   leaf-custom-property write        0.1ms      0.1ms                          -
 *   plain-property write              0.1ms      0.1ms                          -
 *   shell-height-write x30            5.0ms      5.0ms                          -
 *   resize-dispatch x30               0.0ms      0.0ms                          -
 *   add-task-bar-open                49.0ms     37.0ms                     41.0ms
 *
 * The same run under `--project=measure-chromium` (Blink, 2026-09):
 *
 *                                   0 rows   201 rows   201 rows, content-vis
 *   root-custom-property write        1.0ms     14.1ms                 1.9-4.0ms
 *   leaf-custom-property write        0.1ms      0.0ms                     0.1ms
 *   plain-property write              0.3ms      0.3ms                     0.3ms
 *
 * Blink charges the same mechanism roughly an order of magnitude less: still 14x
 * the leaf write and still scaling with row count, but ~14ms rather than
 * hundreds. Worth knowing before porting an iOS fix to the Android path on the
 * strength of the WebKit number alone — and note `content-visibility` cuts it
 * severalfold here while doing nothing at all in WebKit.
 *
 * Only the root custom-property write scales, and it scales hard. The identical
 * write on a leaf stays at 0.1ms with 201 rows on screen, so the cost is style
 * invalidation across everything that could inherit the property — not the write,
 * and not layout. Collapsing the Completed Tasks section, the reporter's own
 * workaround, drops it to 121.9ms because `collapsible.component.html` wraps its
 * panel in a structural `@if`: those rows leave the DOM. `display: none` does NOT
 * help, because WebKit still computes style for display-none subtrees, and
 * neither does `content-visibility` — both land inside the run-to-run drift that
 * the repeated `[rows: none, repeat]` baseline exists to expose.
 *
 * The shell-height write and the synthetic resize are genuinely flat. The resize
 * costs nothing here partly because the app is zoneless
 * (`provideZonelessChangeDetection`), and partly because this harness runs it
 * with no overlay open, which is not the state the real keyboard opens in.
 *
 * KNOWN BLIND SPOTS. `_initIOSKeyboardHandling` is gated on native iOS, so it
 * never runs here: these are hand-simulated writes, not the real event sequence.
 * Headless WebKit also does no real tile rasterization and has no soft keyboard,
 * so the cost of Capacitor `resize: 'native'` animating the WKWebView frame is
 * out of reach at any list size. Absolute numbers are relative indicators only —
 * an A15 is not this machine.
 *
 * Timing note: WebKit clamps `performance.now()` to 1ms, so nothing below times
 * a single operation directly. `shell-height-write` and `resize-dispatch` report
 * the total across N iterations; `root ... write` divides its N-iteration total
 * back down to a per-write figure, which is only meaningful because each write
 * is far above the clamp. `add-task-bar-open` polls with requestAnimationFrame,
 * so it is quantised to ~16.7ms — differences under one frame are not real.
 *
 * These per-write figures do NOT extrapolate to a run of writes. The write
 * measurements force a layout read after every write, which is what isolates one
 * write's cost — but it also defeats the coalescing a real caller gets for free.
 * Measured against 201 rows in WebKit, relative to one write with a forced read:
 * four writes each followed by a forced read cost ~4x; four writes with a single
 * forced read at the end cost ~1x. So consecutive writes with no layout read
 * between them are about ONE recalc, not N. Ratios, not absolutes — each case
 * ran once in a fixed order, so the millisecond figures carry ordering noise
 * (creating a custom property is not the same work as updating one) and are
 * deliberately not quoted here; a 4x spread survives that, a 20% one would not.
 * The batched case also wrote dummy properties nothing consumes, so vars that
 * feed a `calc()` in the SCSS may cost more. Before citing these numbers against
 * code that writes several properties in a row — the four `--safe-area-inset-*`
 * writes in `_initSafeAreaInsets`, say — check whether it reads layout in
 * between. Usually it does not.
 */
import { expect, test } from '../fixtures/test.fixture';
import type { Page } from '@playwright/test';

/** The reporter's Inbox: 128 open + 73 done. */
const OPEN_TASK_COUNT = Number(process.env.MEASURE_OPEN_TASK_COUNT ?? 128);
const DONE_TASK_COUNT = Number(process.env.MEASURE_DONE_TASK_COUNT ?? 73);
const TASK_COUNT = OPEN_TASK_COUNT + DONE_TASK_COUNT;
/** Mirrors the op-log batch cap; only affects how the seed is chunked. */
const MAX_BATCH_OPERATIONS_SIZE = 50;
const SHELL_WRITE_FRAMES = 30;
const RESIZE_DISPATCHES = 30;
const ROOT_WRITES = 20;
const WRITE_KINDS = [
  'root-custom-property',
  'leaf-custom-property',
  'plain-property',
] as const;
const OPEN_REPS = 11;
/** The first open of each variant pays for lazy work that never repeats. */
const OPEN_WARMUP_REPS = 2;
const INBOX_PROJECT_ID = 'INBOX_PROJECT';

/** Row-level CSS whose effect on each measurement is worth knowing. */
const ROW_VARIANTS: readonly { label: string; css: string }[] = [
  { label: 'none', css: '' },
  {
    label: 'content-visibility',
    css: 'task { content-visibility: auto; contain-intrinsic-size: auto 52px; }',
  },
  // The discriminator: `display: none` removes the rows from layout but not from
  // style computation, so a cost that survives it is style invalidation.
  { label: 'display:none', css: 'task { display: none; }' },
];

const STYLE_ID = 'measure-variant-style';

const applyRowVariant = async (page: Page, css: string): Promise<void> => {
  await page.evaluate(
    ({ id, variantCss }) => {
      document.getElementById(id)?.remove();
      if (variantCss) {
        const style = document.createElement('style');
        style.id = id;
        style.textContent = variantCss;
        document.head.appendChild(style);
      }
      // Settle the new styles so they are not charged to the next measurement.
      document.body.getBoundingClientRect();
    },
    { id: STYLE_ID, variantCss: css },
  );
};

const clearRowVariant = (page: Page): Promise<void> => applyRowVariant(page, '');

const seedProjectTasks = async (
  page: Page,
  taskIdPrefix: string,
  openCount: number,
  doneCount: number,
): Promise<void> => {
  await page.evaluate(
    ({ batchSize, doneTaskCount, idPrefix, openTaskCount, projectId }) => {
      const count = openTaskCount + doneTaskCount;
      const store = (
        window as unknown as {
          __e2eTestHelpers?: { store?: { dispatch: (action: unknown) => void } };
        }
      ).__e2eTestHelpers?.store;
      if (!store) {
        throw new Error('__e2eTestHelpers.store missing — is this a dev/stage build?');
      }
      const operations = Array.from({ length: count }, (_, index) => ({
        type: 'create',
        tempId: `temp-${index}`,
        // Done rows land in the collapsible Completed Tasks section, which is
        // what the reporter collapses to make the lag go away.
        data: { title: `Measure seed ${index + 1}`, isDone: index >= openTaskCount },
      }));
      const createdTaskIds = Object.fromEntries(
        operations.map(({ tempId }, index) => [
          tempId,
          `${idPrefix}${String(index).padStart(4, '0')}`,
        ]),
      );
      for (let offset = 0; offset < operations.length; offset += batchSize) {
        store.dispatch({
          type: '[Task Shared] batchUpdateForProject',
          projectId,
          operations: operations.slice(offset, offset + batchSize),
          createdTaskIds,
          createdTaskTimestamp: 1_750_000_000_000,
          meta: {
            isPersistent: true,
            entityType: 'PROJECT',
            entityId: projectId,
            opType: 'BATCH',
          },
        });
      }
    },
    {
      batchSize: MAX_BATCH_OPERATIONS_SIZE,
      doneTaskCount: doneCount,
      idPrefix: taskIdPrefix,
      openTaskCount: openCount,
      projectId: INBOX_PROJECT_ID,
    },
  );
};

interface Sample {
  readonly label: string;
  readonly rowCount: number;
  readonly values: number[];
}

const median = (values: readonly number[]): number =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

const summarize = ({ label, rowCount, values }: Sample, unit: string): string => {
  const sorted = [...values].sort((a, b) => a - b);
  return (
    `${label.padEnd(38)} rows=${String(rowCount).padStart(4)} ` +
    `median=${median(values).toFixed(1)}${unit} ` +
    `min=${sorted[0].toFixed(1)}${unit} max=${sorted[sorted.length - 1].toFixed(1)}${unit}`
  );
};

/**
 * Shell-height write plus the forced layout the browser would do before paint,
 * totalled over `frames` because of the 1ms clock clamp.
 */
const measureShellHeightWrites = async (page: Page, frames: number): Promise<Sample> =>
  page.evaluate((frameCount) => {
    const shell = document.querySelector('.app-container') as HTMLElement | null;
    if (!shell) {
      throw new Error('.app-container missing');
    }
    const base = window.innerHeight;
    // Mimic the shrink animation: a different height every frame, which is what
    // iosShellHeight writes as visualViewport resize events land.
    const writeFrame = (i: number): void => {
      const height = base - 300 - (i % 7);
      shell.style.height = `${height}px`;
      shell.style.minHeight = `${height}px`;
      shell.getBoundingClientRect();
    };
    const runs: number[] = [];
    for (let run = 0; run < 5; run++) {
      for (let i = 0; i < 5; i++) {
        writeFrame(i);
      }
      const started = performance.now();
      for (let i = 0; i < frameCount; i++) {
        writeFrame(i);
      }
      runs.push(performance.now() - started);
    }
    shell.style.height = '';
    shell.style.minHeight = '';
    shell.getBoundingClientRect();
    return {
      label: `shell-height-write x${frameCount}`,
      rowCount: document.querySelectorAll('task').length,
      values: runs,
    };
  }, frames);

/**
 * The write `keyboardWillShow`/`keyboardWillHide` still make on the root
 * (`global-theme.service.ts`: `--keyboard-height`, `--keyboard-overlay-offset`),
 * against the same write aimed at a leaf element.
 *
 * A custom property invalidates the computed style of everything that could
 * inherit it, so on `document.documentElement` its cost scales with the whole
 * rendered tree, and on a leaf it does not. That pair is the measurement: it is
 * the difference the #9809 treatment of `--visual-viewport-height` would make if
 * applied to these two as well.
 *
 * `plain-property` is a third, weaker reading: a non-inherited property on the
 * root. It reports whether the write plus the forced rect read is itself free —
 * NOT whether layout is free, since it does not move the rows (the returned
 * label says which, so a 0ms reading is never mistaken for the latter).
 */
type WriteKind = 'root-custom-property' | 'leaf-custom-property' | 'plain-property';

const measureCssVarWrites = async (
  page: Page,
  kind: WriteKind,
  writes: number,
): Promise<Sample> =>
  page.evaluate(
    ({ propertyKind, writeCount }) => {
      const root = document.documentElement;
      const leaf = document.querySelector('.add-task-button') as HTMLElement | null;
      if (propertyKind === 'leaf-custom-property' && !leaf) {
        throw new Error('.add-task-button missing — no leaf to write to');
      }
      const lastRow = (): Element | null => document.querySelector('task:last-of-type');
      const write = (i: number): void => {
        if (propertyKind === 'root-custom-property') {
          root.style.setProperty('--keyboard-height', `${300 + (i % 7)}px`);
        } else if (propertyKind === 'leaf-custom-property') {
          leaf!.style.setProperty('--keyboard-height', `${300 + (i % 7)}px`);
        } else {
          root.style.setProperty('padding-top', `${i % 7}px`);
        }
        // Force the style recalculation the browser would do before paint.
        document.body.getBoundingClientRect();
      };
      // A reading of ~0ms only means "cheap"; whether it also relayouts the rows
      // is a separate question, and reporting it stops the two being conflated.
      write(0);
      const before = lastRow()?.getBoundingClientRect().top;
      write(5);
      const movesRows = before !== lastRow()?.getBoundingClientRect().top;

      const runs: number[] = [];
      for (let run = 0; run < 5; run++) {
        const started = performance.now();
        for (let i = 0; i < writeCount; i++) {
          write(i);
        }
        runs.push((performance.now() - started) / writeCount);
      }
      root.style.removeProperty('--keyboard-height');
      root.style.removeProperty('padding-top');
      leaf?.style.removeProperty('--keyboard-height');
      document.body.getBoundingClientRect();
      return {
        label: `${propertyKind} write (moves rows: ${movesRows})`,
        rowCount: document.querySelectorAll('task').length,
        values: runs,
      };
    },
    { propertyKind: kind, writeCount: writes },
  );

/** The synthetic window resize `_notifyIOSViewportChange` fires per frame. */
const measureResizeDispatch = async (page: Page, dispatches: number): Promise<Sample> =>
  page.evaluate((count) => {
    const burst = (): void => {
      for (let i = 0; i < count; i++) {
        window.dispatchEvent(new Event('resize'));
      }
      // Charge the layout the app would be forced into before the next paint.
      document.body.getBoundingClientRect();
    };
    burst();
    const runs: number[] = [];
    for (let run = 0; run < 5; run++) {
      const started = performance.now();
      burst();
      runs.push(performance.now() - started);
    }
    return {
      label: `resize-dispatch x${count}`,
      rowCount: document.querySelectorAll('task').length,
      values: runs,
    };
  }, dispatches);

/**
 * The reported interaction, timed in-page so Playwright IPC and actionability
 * checks stay out of the number.
 */
const measureAddTaskBarOpen = async (
  page: Page,
  label: string,
  reps: number,
): Promise<Sample> => {
  const values: number[] = [];
  for (let rep = 0; rep < reps + OPEN_WARMUP_REPS; rep++) {
    const elapsed = await page.evaluate(async () => {
      const button = document.querySelector('.add-task-button') as HTMLElement | null;
      if (!button) {
        throw new Error('.add-task-button missing — is the mobile bottom nav shown?');
      }
      if (document.querySelector('add-task-bar.global')) {
        throw new Error('add-task-bar already open — the previous rep did not close');
      }
      const until = (predicate: () => boolean): Promise<number> =>
        new Promise((resolve, reject) => {
          const deadline = performance.now() + 20000;
          const check = (): void => {
            if (predicate()) {
              resolve(performance.now());
            } else if (performance.now() > deadline) {
              reject(new Error('timed out waiting for the add-task bar'));
            } else {
              requestAnimationFrame(check);
            }
          };
          check();
        });

      const started = performance.now();
      button.click();
      // Focus, not mere presence: the reporter's complaint is the delay before
      // they can type, which is what the keyboard hangs off.
      const focusedAt = await until(
        () => !!document.activeElement?.closest('add-task-bar.global'),
      );
      return focusedAt - started;
    });
    if (rep >= OPEN_WARMUP_REPS) {
      values.push(elapsed);
    }

    // Closed through the store, not Escape: a keypress that lands a frame before
    // the input takes focus is silently dropped, and the next rep then aborts on
    // an already-open bar.
    await page.evaluate(() => {
      const store = (
        window as unknown as {
          __e2eTestHelpers?: { store?: { dispatch: (action: unknown) => void } };
        }
      ).__e2eTestHelpers?.store;
      store?.dispatch({ type: '[Layout] Hide AddTaskBar' });
    });
    await page.locator('add-task-bar.global').waitFor({ state: 'detached' });
  }
  return {
    label: `add-task-bar-open [rows: ${label}]`,
    rowCount: await page.locator('task').count(),
    values,
  };
};

test.describe('#9779 iOS add-task-bar open cost', () => {
  test('what scales with the number of rendered task rows', async ({
    page,
    workViewPage,
    testPrefix,
    browserName,
  }) => {
    const lines: string[] = [];
    // browserName, not a user-agent sniff: the shared fixture overrides the UA
    // with "PLAYWRIGHT", so sniffing for "Chrome" reported webkit under both
    // projects and silently mislabelled every Chromium run.
    lines.push(
      `engine=${browserName} ` +
        (await page.evaluate(
          () => `viewport=${window.innerWidth}x${window.innerHeight}`,
        )),
    );

    // Seed straight into the built-in Inbox project: creating one through the UI
    // needs the side nav, which is collapsed at this viewport.
    await page.evaluate((projectId) => {
      window.location.hash = `#/project/${projectId}/tasks`;
    }, INBOX_PROJECT_ID);
    await workViewPage.waitForTaskList();
    // The FAB is the entry point every open measurement uses; without it the
    // harness would silently measure nothing.
    await expect(page.locator('.add-task-button')).toBeVisible();

    // Boot work (lazy chunks, first render, initial sync) keeps running for a
    // while after the list appears, and it lands squarely on whatever is measured
    // first. Burn it off, otherwise the empty-list baseline reads slower than the
    // 200-row case and the comparison inverts.
    // `waitForTimeout` is banned in e2e/tests for good reason; here there is no
    // event to wait for — the point is to let unrelated boot work drain.
    await page.waitForTimeout(2000);
    await measureShellHeightWrites(page, SHELL_WRITE_FRAMES);
    await measureAddTaskBarOpen(page, 'warmup', 1);

    lines.push('--- empty list ---');
    for (const kind of WRITE_KINDS) {
      lines.push(summarize(await measureCssVarWrites(page, kind, ROOT_WRITES), 'ms'));
    }
    lines.push(summarize(await measureShellHeightWrites(page, SHELL_WRITE_FRAMES), 'ms'));
    lines.push(summarize(await measureResizeDispatch(page, RESIZE_DISPATCHES), 'ms'));
    lines.push(summarize(await measureAddTaskBarOpen(page, 'none', OPEN_REPS), 'ms'));

    const taskIdPrefix = `${testPrefix}-measure-`;
    await seedProjectTasks(page, taskIdPrefix, OPEN_TASK_COUNT, DONE_TASK_COUNT);
    // A silent seeding failure would look exactly like "cost does not scale",
    // so the row count is asserted rather than merely reported.
    await expect(page.locator(`task[data-task-id^="${taskIdPrefix}"]`)).toHaveCount(
      TASK_COUNT,
      { timeout: 30000 },
    );
    await page.waitForTimeout(1500);

    lines.push(
      `--- ${TASK_COUNT} tasks (${OPEN_TASK_COUNT} open + ${DONE_TASK_COUNT} done) ---`,
    );
    for (const { label, css } of ROW_VARIANTS) {
      await applyRowVariant(page, css);
      for (const kind of WRITE_KINDS) {
        lines.push(
          summarize(await measureCssVarWrites(page, kind, ROOT_WRITES), 'ms') +
            `  [rows: ${label}]`,
        );
      }
      lines.push(
        summarize(await measureShellHeightWrites(page, SHELL_WRITE_FRAMES), 'ms') +
          `  [rows: ${label}]`,
      );
      lines.push(
        summarize(await measureResizeDispatch(page, RESIZE_DISPATCHES), 'ms') +
          `  [rows: ${label}]`,
      );
      await clearRowVariant(page);
    }
    // Variants run in fixed order, and these numbers drift upward over a run.
    // Repeating the unmodified baseline last is what tells a real variant effect
    // apart from that drift — compare each variant to BOTH baselines.
    lines.push(
      summarize(
        await measureCssVarWrites(page, 'root-custom-property', ROOT_WRITES),
        'ms',
      ) + '  [rows: none, repeat]',
    );
    for (const { label, css } of ROW_VARIANTS) {
      await applyRowVariant(page, css);
      lines.push(summarize(await measureAddTaskBarOpen(page, label, OPEN_REPS), 'ms'));
      await clearRowVariant(page);
    }

    // The reporter's own workaround, run as an A/B. Collapsing is not hiding:
    // `collapsible.component.html` wraps its panel in a structural `@if`, so the
    // done rows leave the DOM entirely rather than becoming `display: none`.
    const doneHeader = page
      .locator('collapsible', { hasText: 'Completed Tasks' })
      .locator('.collapsible-header')
      .first();
    await doneHeader.click();
    await expect(page.locator('task')).toHaveCount(OPEN_TASK_COUNT);
    lines.push(`--- ${OPEN_TASK_COUNT} tasks, Completed Tasks collapsed ---`);
    lines.push(
      summarize(
        await measureCssVarWrites(page, 'root-custom-property', ROOT_WRITES),
        'ms',
      ),
    );
    lines.push(summarize(await measureAddTaskBarOpen(page, 'none', OPEN_REPS), 'ms'));

    console.log(`\n===== #9779 MEASUREMENT =====\n${lines.join('\n')}\n`);
  });
});

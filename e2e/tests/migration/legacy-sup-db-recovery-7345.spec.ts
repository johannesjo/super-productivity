import { test, expect, Page } from '@playwright/test';
import legacyV12Data from '../../../src/app/op-log/backup/test-fixtures/legacy-v10-backup.json';
import { skipOnboardingForE2E } from '../../utils/waits';
import { readMigratedState } from '../../utils/legacy-migration-helpers';

/**
 * #7345 / v17 gap: Super Productivity v12 and older kept everything in the `SUP`
 * IndexedDB (store `SUP_STORE`, one record per model). v13–v16 copied it into
 * `pf` on first start; v17.0.0 removed that step (04728267e). A profile that
 * jumps from v12 or older straight to a current build therefore boots into an
 * empty app with no hint, while its data is still on disk.
 *
 * Run: npm run e2e:file e2e/tests/migration/legacy-sup-db-recovery-7345.spec.ts -- --retries=0
 */

/** v13–v16 wrote this in place of the timestamp once the data was copied. */
const MIGRATED_MARKER = 42;

/** Writes a v12-era `SUP` database exactly as v12's IndexedDBAdapterService laid it out. */
const seedSupDatabase = (page: Page, lastSyncModelChange: number): Promise<string> =>
  page.evaluate(
    ([data, lastChange]) =>
      new Promise<string>((resolve) => {
        const req = indexedDB.open('SUP', 2);
        req.onupgradeneeded = () => req.result.createObjectStore('SUP_STORE');
        req.onerror = () => resolve('OPEN-ERROR:' + String(req.error));
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('SUP_STORE', 'readwrite');
          const store = tx.objectStore('SUP_STORE');
          for (const [key, value] of Object.entries(data)) {
            if (key !== 'lastLocalSyncModelChange' && key !== 'lastArchiveUpdate') {
              store.put(value, key);
            }
          }
          store.put(lastChange, 'LOCAL_LAST_SYNC_MODEL_CHANGE');
          tx.oncomplete = () => {
            db.close();
            resolve('OK');
          };
          tx.onerror = () => resolve('TX-ERROR:' + String(tx.error));
        };
      }),
    [legacyV12Data as Record<string, unknown>, lastSyncModelChange] as const,
  );

/** Seeds `SUP` while the app's JS is blocked, then boots the app on top of it. */
const bootOnSupDatabase = async (
  page: Page,
  lastSyncModelChange: number,
): Promise<void> => {
  await page.addInitScript(skipOnboardingForE2E);
  await page.route('**/*.js', (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(await seedSupDatabase(page, lastSyncModelChange)).toBe('OK');
  await page.unroute('**/*.js');
};

test.describe('@migration v12 SUP database on a blank start (#7345)', () => {
  test('offers the never-migrated v12 data and imports it', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL: baseURL || 'http://localhost:4242',
      acceptDownloads: true,
    });
    const page = await context.newPage();
    try {
      await bootOnSupDatabase(page, legacyV12Data.lastLocalSyncModelChange);

      const prompts: string[] = [];
      page.on('dialog', async (dialog) => {
        prompts.push(dialog.message());
        await dialog.accept();
      });
      const downloadPromise = page.waitForEvent('download', { timeout: 60000 });

      await page.reload({ waitUntil: 'domcontentloaded' });

      // The copy is saved before anything is imported.
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('sp-pre-v13-data');

      await expect
        .poll(
          async () =>
            (
              await readMigratedState<{ task?: { ids: string[] } }>(page).catch(
                () => ({}),
              )
            ).task?.ids ?? [],
          { timeout: 30000 },
        )
        .toEqual(expect.arrayContaining(['task-1', 'task-2', 'task-2-sub', 'task-3']));

      expect(prompts.some((msg) => msg.includes('12 or older'))).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('stays silent when v13–v16 already migrated the SUP data', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL: baseURL || 'http://localhost:4242',
    });
    const page = await context.newPage();
    try {
      await bootOnSupDatabase(page, MIGRATED_MARKER);

      const prompts: string[] = [];
      page.on('dialog', async (dialog) => {
        prompts.push(dialog.message());
        await dialog.dismiss();
      });

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('magic-side-nav', { state: 'visible', timeout: 30000 });
      // The startup check runs before the app is interactive; give a slow
      // IndexedDB read the same window the positive case gets for its prompt.
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      expect(prompts.filter((msg) => msg.includes('12 or older'))).toEqual([]);
    } finally {
      await context.close();
    }
  });
});

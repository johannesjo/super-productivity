import { test, expect, Page } from '@playwright/test';
import legacyPartial from '../../../src/app/op-log/validation/test-fixtures/legacy-pf-v13-partial-models.json';
import { MIGRATION_BACKUP_PREFIX } from '../../../electron/shared-with-frontend/get-backup-timestamp';
import { skipOnboardingForE2E } from '../../utils/waits';
import { seedLegacyDatabase } from '../../utils/legacy-migration-helpers';

/**
 * Issue #9770: a `pf` database written by an older version only holds the model
 * keys that existed back then. The reporter's (a July 2025 install) has no
 * `timeTracking`, `menuTree` or `boards`; typia rejects the data, `dataRepair`
 * has no defaults for those three, so migration threw "Data repair failed" and
 * the app dead-ended on "Migration Failed" then "Failed to load data" — on
 * every restart, with no way out.
 *
 * The unit tests pin the pieces (the slice fill, the preserved repair guard,
 * the post-repair validation). None of them can show that the app actually
 * STARTS with this database on disk, because they all mock LegacyPfDbService.
 * That is what this test is for: it seeds the reporter's real backup into a
 * real `pf` IndexedDB and asserts the migration completes and the app renders.
 *
 * The fixture is imported from the unit test-fixtures directory on purpose —
 * one copy of the reporter's data, so the two suites cannot drift apart.
 *
 * Run: npm run e2e:file e2e/tests/migration/legacy-partial-model-slices-9770.spec.ts -- --retries=0
 */

/** Read the migrated store back out of SUP_OPS. */
const readMigratedState = async (
  page: Page,
): Promise<Record<string, { ids?: string[] } | undefined>> =>
  page.evaluate(
    async () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('SUP_OPS');
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const tx = db.transaction('state_cache', 'readonly');
          const getReq = tx.objectStore('state_cache').get('current');
          getReq.onsuccess = () => {
            db.close();
            resolve(getReq.result?.state || {});
          };
          getReq.onerror = () => {
            db.close();
            reject(getReq.error);
          };
        };
        request.onerror = () => reject(request.error);
      }),
  );

test.describe('@migration #9770 legacy data missing newer model slices', () => {
  test('app migrates and starts when the pf database predates timeTracking, menuTree and boards', async ({
    browser,
    baseURL,
  }) => {
    const partialData = JSON.parse(JSON.stringify(legacyPartial)) as Record<
      string,
      unknown
    >;
    // Guard the premise: if the fixture ever gains these keys the test would
    // pass without exercising the bug at all.
    for (const missing of ['timeTracking', 'menuTree', 'boards']) {
      expect(missing in partialData).toBe(false);
    }

    const context = await browser.newContext({
      storageState: undefined,
      baseURL: baseURL || 'http://localhost:4242',
      acceptDownloads: true,
    });
    const page = await context.newPage();
    await page.addInitScript(skipOnboardingForE2E);

    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    try {
      await page.route('**/*.js', async (route) => route.abort());
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await seedLegacyDatabase(page, partialData);
      await page.unroute('**/*.js');

      // The auto-backup download happens BEFORE the migration itself, so it
      // fires in the broken case too — it only proves migration was attempted.
      const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
      await page.reload({ waitUntil: 'domcontentloaded' });
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain(MIGRATION_BACKUP_PREFIX);

      await page.waitForSelector('magic-side-nav', { state: 'visible', timeout: 30000 });

      // The load-bearing assertion: pre-fix, _performMigration throws before
      // appendOperationAndSnapshot, so no snapshot is ever written and this
      // poll times out.
      await expect
        .poll(async () => (await readMigratedState(page)).task?.ids?.length ?? 0, {
          timeout: 30000,
        })
        .toBe(1);

      const state = await readMigratedState(page);
      expect(state.task?.ids).toEqual(['TJ-NDR6Sjc0qc0TS-tUgE']);
      // The slices the old database never had are present in the migrated store.
      expect(state.timeTracking).toBeDefined();
      expect(state.menuTree).toBeDefined();
      expect(state.boards).toBeDefined();

      // The user-visible symptom: no migration error dialog is left on screen.
      await expect(page.locator('dialog-legacy-migration .error-message')).toHaveCount(0);

      // Checked last: the IndexedDB poll above is a real settle window, so a
      // startup failure has had time to surface.
      expect(pageErrors.filter((m) => /migration|repair|validation/i.test(m))).toEqual(
        [],
      );
    } finally {
      await context.close();
    }
  });
  // The other half of #9770: when legacy data genuinely CANNOT be migrated the
  // app used to dead-end on this dialog forever — OK was the only button and
  // every restart landed right back here. Seeds a database with settings but no
  // task/project state, which isDataRepairPossible() refuses by design.
  test('offers a way out when the legacy data cannot be migrated at all', async ({
    browser,
    baseURL,
  }) => {
    const unmigratableData = {
      globalConfig: (legacyPartial as Record<string, unknown>).globalConfig,
    };

    const context = await browser.newContext({
      storageState: undefined,
      baseURL: baseURL || 'http://localhost:4242',
      acceptDownloads: true,
    });
    const page = await context.newPage();
    await page.addInitScript(skipOnboardingForE2E);

    try {
      await page.route('**/*.js', async (route) => route.abort());
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await seedLegacyDatabase(page, unmigratableData);
      await page.unroute('**/*.js');

      const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await downloadPromise;

      // The dead end itself.
      const dialog = page.locator('dialog-legacy-migration');
      await expect(dialog.locator('.error-message')).toBeVisible({ timeout: 30000 });

      // The escape hatch is offered only because the backup download above
      // already happened.
      const startFreshBtn = dialog.getByRole('button', {
        name: 'Delete old data and start fresh',
      });
      await expect(startFreshBtn).toBeVisible();
      await startFreshBtn.click();

      // Destructive, so it takes a second, explicit confirmation.
      await expect(dialog.locator('.start-fresh-warning')).toBeVisible();
      await dialog.getByRole('button', { name: 'Delete and start fresh' }).click();

      // The app reloads itself and comes up empty instead of dead-ending again.
      await page.waitForSelector('magic-side-nav', { state: 'visible', timeout: 30000 });
      await expect(page.locator('dialog-legacy-migration')).toHaveCount(0);

      // The legacy database is really gone — otherwise the next boot would
      // walk straight back into the same failed migration.
      const legacyKeys = await page.evaluate(
        async () =>
          new Promise<number>((resolve, reject) => {
            const req = indexedDB.open('pf', 1);
            req.onsuccess = () => {
              const db = req.result;
              const countReq = db
                .transaction('main', 'readonly')
                .objectStore('main')
                .count();
              countReq.onsuccess = () => {
                db.close();
                resolve(countReq.result);
              };
              countReq.onerror = () => {
                db.close();
                reject(countReq.error);
              };
            };
            req.onerror = () => reject(req.error);
          }),
      );
      expect(legacyKeys).toBe(0);
    } finally {
      await context.close();
    }
  });
});

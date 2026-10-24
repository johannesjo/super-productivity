import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '../../fixtures/webdav.fixture';
import { SyncPage } from '../../pages/sync.page';
import { WorkViewPage } from '../../pages/work-view.page';
import { waitForStatePersistence } from '../../utils/waits';
import {
  WEBDAV_CONFIG_TEMPLATE,
  WEBDAV_SYNC_FILE,
  closeContextsSafely,
  createSyncFolder,
  generateSyncFolderName,
  setupSyncClient,
  waitForSyncComplete,
} from '../../utils/sync-helpers';

/**
 * #10916 hypothesis (unconfirmed provider): the sync file loses the phone's
 * upload outside the app, and the desktop then writes on that stale base.
 *
 * A file shared through a cloud folder (local-file sync over iCloud, Syncthing,
 * Google Drive) or a server that ignores If-Match can do this: the desktop
 * still sees the old file, its write passes its own rev check, and the folder
 * tool keeps the desktop's copy. The desktop reports success without the
 * phone's tasks. The phone then sees a remote clock CONCURRENT with the one it
 * last saw (lineage break), re-downloads from seq 0 and, having no pending
 * ops, hydrates the snapshot: its already-uploaded tasks are gone too.
 *
 * Restoring the pre-upload file over WebDAV stands in for the folder tool.
 * Expected: neither device loses the phone's task.
 *
 * Run: npm run quiet -- e2e:webdav:file e2e/tests/sync/webdav-lost-update-concurrent-snapshot-10916.spec.ts --retries=0
 */
const INBOX_URL = '/#/project/INBOX_PROJECT/tasks';
const AUTHORIZATION =
  'Basic ' +
  Buffer.from(
    `${WEBDAV_CONFIG_TEMPLATE.username}:${WEBDAV_CONFIG_TEMPLATE.password}`,
  ).toString('base64');

const syncFileUrl = (folder: string): string =>
  `${WEBDAV_CONFIG_TEMPLATE.baseUrl}${folder}/DEV/${WEBDAV_SYNC_FILE}`;

const readRaw = async (request: APIRequestContext, folder: string): Promise<string> => {
  const response = await request.get(syncFileUrl(folder), {
    headers: { Authorization: AUTHORIZATION },
  });
  expect(response.ok()).toBe(true);
  return response.text();
};

const writeRaw = async (
  request: APIRequestContext,
  folder: string,
  body: string,
): Promise<void> => {
  const response = await request.put(syncFileUrl(folder), {
    headers: { Authorization: AUTHORIZATION },
    data: body,
  });
  expect(response.ok()).toBe(true);
};

test.describe('@webdav Lost upload overwritten by a stale-base writer (#10916)', () => {
  test('phone keeps its synced tasks when the desktop writes over a stale file', async ({
    browser,
    baseURL,
    request,
  }) => {
    // Restoring one file only stands in for a lost update in the single-file format.
    test.skip(WEBDAV_SYNC_FILE !== 'sync-data.json', 'single-file format only');
    test.slow();
    const folder = generateSyncFolderName('e2e-lost-update-10916');
    await createSyncFolder(request, folder);
    const config = { ...WEBDAV_CONFIG_TEMPLATE, syncFolderPath: `/${folder}` };
    const url = baseURL || 'http://localhost:4242';
    const phoneTask = `Phone-task-${Date.now()}`;
    const desktopTask = `Desktop-task-${Date.now()}`;

    const phone = await setupSyncClient(browser, url);
    let desktop: Awaited<ReturnType<typeof setupSyncClient>> | undefined;

    try {
      const syncPhone = new SyncPage(phone.page);
      const workPhone = new WorkViewPage(phone.page);
      await workPhone.waitForTaskList();
      await syncPhone.setupWebdavSync(config);
      await waitForSyncComplete(phone.page, syncPhone);

      desktop = await setupSyncClient(browser, url);
      const syncDesktop = new SyncPage(desktop.page);
      const workDesktop = new WorkViewPage(desktop.page);
      await workDesktop.waitForTaskList();
      await syncDesktop.setupWebdavSync(config);
      await waitForSyncComplete(desktop.page, syncDesktop);

      // The file both devices agree on before the phone's upload.
      const staleFile = await readRaw(request, folder);

      // --- Phone adds a task and uploads it ---
      await workPhone.addTask(phoneTask);
      await waitForStatePersistence(phone.page);
      await syncPhone.triggerSync();
      expect(await waitForSyncComplete(phone.page, syncPhone)).toBe('success');
      expect(await readRaw(request, folder)).toContain(phoneTask);

      // --- The phone's upload is lost; the desktop writes on the stale file ---
      await writeRaw(request, folder, staleFile);
      await workDesktop.addTask(desktopTask);
      await waitForStatePersistence(desktop.page);
      await syncDesktop.triggerSync();
      expect(await waitForSyncComplete(desktop.page, syncDesktop)).toBe('success');
      const afterDesktop = await readRaw(request, folder);
      expect(afterDesktop).toContain(desktopTask);
      expect(afterDesktop).not.toContain(phoneTask);

      phone.page.on('console', (msg) => {
        if (/OperationLogSyncService|FileBasedSyncAdapter/.test(msg.text())) {
          console.log(`[10916][phone] ${msg.text().slice(0, 300)}`);
        }
      });

      // --- Phone syncs: it must not drop its own uploaded task ---
      await syncPhone.triggerSync();
      // 'conflict' (a dialog) is a different outcome from silent hydration; log it
      // so a failure below can be told apart.
      console.log(
        `[10916] phone sync result: ${await waitForSyncComplete(phone.page, syncPhone)}`,
      );
      await phone.page.goto(INBOX_URL);
      // The phone's own task first: its loss is the reported symptom.
      await expect(
        phone.page.locator('task', { hasText: phoneTask }).first(),
      ).toBeVisible();
      await expect(
        phone.page.locator('task', { hasText: desktopTask }).first(),
      ).toBeVisible();

      // --- Desktop syncs again and converges ---
      await syncDesktop.triggerSync();
      await waitForSyncComplete(desktop.page, syncDesktop);
      await desktop.page.goto(INBOX_URL);
      await expect(
        desktop.page.locator('task', { hasText: phoneTask }).first(),
      ).toBeVisible();
      await expect(
        desktop.page.locator('task', { hasText: desktopTask }).first(),
      ).toBeVisible();
    } finally {
      await closeContextsSafely(phone.context, desktop?.context);
    }
  });
});

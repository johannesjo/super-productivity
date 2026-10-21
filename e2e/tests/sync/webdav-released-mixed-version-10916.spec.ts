import { expect, type Browser, type Page } from '@playwright/test';
import { test } from '../../fixtures/webdav.fixture';
import { SyncPage } from '../../pages/sync.page';
import { WorkViewPage } from '../../pages/work-view.page';
import { waitForStatePersistence } from '../../utils/waits';
import {
  WEBDAV_CONFIG_TEMPLATE,
  setupSyncClient,
  createSyncFolder,
  waitForSyncComplete,
  generateSyncFolderName,
  closeContextsSafely,
} from '../../utils/sync-helpers';
import {
  loadedEntryScript,
  releasedEntryScript,
  serveReleasedClientAssets,
} from '../../utils/released-client-assets';

/**
 * #10916: a v19.1.0 desktop and a v19.2.0 phone share a WebDAV folder. Tasks
 * the phone adds to Today must reach the desktop and stay on the phone.
 * Runs the unmodified published bundles (scripts/fetch-released-client-assets.sh).
 */
test.describe('@webdav released mixed-version Today tasks (#10916)', () => {
  test.describe.configure({ mode: 'serial' });
  const releasedRoot = process.env.COMPAT_RELEASED_ROOT;
  test.skip(!releasedRoot, 'Set COMPAT_RELEASED_ROOT to the fetched released bundles');

  type Server = Awaited<ReturnType<typeof serveReleasedClientAssets>>;
  let v191: Server;
  let v192: Server;
  // No cookie serves v19.1.0; the cookie upgrades the origin in place.
  let upgradable: Server;
  // Entry scripts of each bundle, to prove which release a client booted.
  let entry191 = '';
  let entry192 = '';
  test.beforeAll(async () => {
    const d191 = `${releasedRoot}/v19.1.0`;
    const d192 = `${releasedRoot}/v19.2.0`;
    entry191 = await releasedEntryScript(d191);
    entry192 = await releasedEntryScript(d192);
    v191 = await serveReleasedClientAssets({ old: d191, new: d191 }, 0);
    v192 = await serveReleasedClientAssets({ old: d192, new: d192 }, 0);
    upgradable = await serveReleasedClientAssets({ old: d192, new: d191 }, 0);
  });
  test.afterAll(async () => {
    await Promise.all([v191?.close(), v192?.close(), upgradable?.close()]);
  });

  interface Client {
    page: Page;
    url: string;
    sync: SyncPage;
    work: WorkViewPage;
    close: () => Promise<void>;
  }

  const openClient = async (
    browser: Browser,
    url: string,
    expectedEntry: string,
  ): Promise<Client> => {
    const { context, page } = await setupSyncClient(browser, url);
    expect(await loadedEntryScript(page)).toBe(expectedEntry);
    return {
      page,
      url,
      sync: new SyncPage(page),
      work: new WorkViewPage(page),
      close: () => closeContextsSafely(context),
    };
  };

  /** Play auto-update: same origin and IndexedDB, newer bundle. */
  const upgradeInPlace = async (client: Client): Promise<void> => {
    await client.page
      .context()
      .addCookies([{ name: 'compat-release', value: 'old', url: client.url }]);
    await client.page.reload();
    expect(await loadedEntryScript(client.page)).toBe(entry192);
  };

  const openToday = async (client: Client): Promise<void> => {
    await client.page.goto(`${client.url}/#/tag/TODAY/tasks`);
    await client.work.waitForTaskList();
  };

  const addToday = async (client: Client, title: string): Promise<void> => {
    await openToday(client);
    await client.work.addTask(`${title} @today`, false, title);
  };

  const syncNow = async (client: Client): Promise<void> => {
    await waitForStatePersistence(client.page);
    await client.sync.triggerSync();
    await waitForSyncComplete(client.page, client.sync);
  };

  const todayTitles = async (client: Client): Promise<string[]> => {
    await openToday(client);
    return (await client.page.locator('task .task-title').allInnerTexts()).sort();
  };

  const newFolder = async (
    request: Parameters<typeof createSyncFolder>[0],
    name: string,
  ): Promise<typeof WEBDAV_CONFIG_TEMPLATE & { syncFolderPath: string }> => {
    const folder = generateSyncFolderName(name);
    await createSyncFolder(request, folder);
    return { ...WEBDAV_CONFIG_TEMPLATE, syncFolderPath: `/${folder}` };
  };

  test('phone on v19.2.0 keeps Today tasks with a v19.1.0 desktop', async ({
    browser,
    request,
  }) => {
    test.slow();
    const config = await newFolder(request, 'e2e-10916');
    const desktop = await openClient(browser, v191.url, entry191);
    const phone = await openClient(browser, v192.url, entry192);
    try {
      await desktop.sync.setupWebdavSync(config);
      await addToday(desktop, 'Desk-Base');
      await syncNow(desktop);
      await phone.sync.setupWebdavSync(config);
      await syncNow(phone);

      await addToday(phone, 'Phone-A');
      await addToday(phone, 'Phone-B');
      await syncNow(phone);
      await syncNow(desktop);
      await syncNow(phone);

      const expected = ['Desk-Base', 'Phone-A', 'Phone-B'];
      expect(await todayTitles(desktop)).toEqual(expected);
      expect(await todayTitles(phone)).toEqual(expected);
    } finally {
      await desktop.close();
      await phone.close();
    }
  });

  test('phone upgraded in place to v19.2.0 keeps Today tasks with a v19.1.0 desktop', async ({
    browser,
    request,
  }) => {
    test.slow();
    const config = await newFolder(request, 'e2e-10916-upgrade');
    const desktop = await openClient(browser, v191.url, entry191);
    const phone = await openClient(browser, upgradable.url, entry191);
    try {
      await desktop.sync.setupWebdavSync(config);
      await addToday(desktop, 'Desk-Base');
      await syncNow(desktop);
      await phone.sync.setupWebdavSync(config);
      await syncNow(phone);
      await addToday(phone, 'Phone-Old');
      await syncNow(phone);
      await syncNow(desktop);
      await addToday(desktop, 'Desk-Two');
      await syncNow(desktop);

      await upgradeInPlace(phone);
      await syncNow(phone);
      await addToday(phone, 'Phone-A');
      await addToday(phone, 'Phone-B');
      await syncNow(phone);
      await syncNow(desktop);
      await syncNow(phone);

      const expected = ['Desk-Base', 'Desk-Two', 'Phone-A', 'Phone-B', 'Phone-Old'];
      expect(await todayTitles(desktop)).toEqual(expected);
      expect(await todayTitles(phone)).toEqual(expected);
    } finally {
      await desktop.close();
      await phone.close();
    }
  });

  test('v19.1.0 desktop with an unsynced edit keeps the phone Today tasks', async ({
    browser,
    request,
  }) => {
    test.slow();
    const config = await newFolder(request, 'e2e-10916-pending');
    const desktop = await openClient(browser, v191.url, entry191);
    const phone = await openClient(browser, v192.url, entry192);
    try {
      await desktop.sync.setupWebdavSync(config);
      await addToday(desktop, 'Desk-Base');
      await syncNow(desktop);
      await phone.sync.setupWebdavSync(config);
      await syncNow(phone);

      await addToday(phone, 'Phone-A');
      await addToday(phone, 'Phone-B');
      await syncNow(phone);
      // The desktop edits before it has seen the phone's upload.
      await addToday(desktop, 'Desk-Pending');
      await syncNow(desktop);
      await syncNow(phone);

      const expected = ['Desk-Base', 'Desk-Pending', 'Phone-A', 'Phone-B'];
      expect(await todayTitles(desktop)).toEqual(expected);
      expect(await todayTitles(phone)).toEqual(expected);
    } finally {
      await desktop.close();
      await phone.close();
    }
  });

  // #10808: the E2E server compresses folders named `gzip-etag-*`, so both
  // releases get 412 on every upload. Nothing converges, but nothing is lost.
  test('behind mod_deflate (#10808) the phone keeps its Today tasks', async ({
    browser,
    request,
  }) => {
    test.slow();
    const config = await newFolder(request, 'gzip-etag-10916');
    const desktop = await openClient(browser, v191.url, entry191);
    const phone = await openClient(browser, v192.url, entry192);
    const putStatuses: number[] = [];
    const recordUploads = (client: Client): void => {
      client.page.on('response', (response) => {
        if (
          response.request().method() === 'PUT' &&
          response.url().endsWith(`${config.syncFolderPath}/sync-data.json`)
        ) {
          putStatuses.push(response.status());
        }
      });
    };
    // These syncs never reach a terminal UI state; wait for the cycle to end.
    const settledSync = async (client: Client): Promise<void> => {
      await waitForStatePersistence(client.page);
      await client.sync.triggerSync();
      await client.sync.waitForTriggeredSyncResponse(20000);
      await client.sync.syncSpinner.waitFor({ state: 'hidden', timeout: 30000 });
      client.sync.completeTriggeredSyncCycle();
    };
    try {
      // Setup creates the file without a precondition; only later uploads fail.
      await desktop.sync.setupWebdavSync(config);
      recordUploads(desktop);
      recordUploads(phone);
      await addToday(desktop, 'Desk-Base');
      await settledSync(desktop);
      await phone.sync.setupWebdavSync(config);
      await settledSync(phone);

      await addToday(phone, 'Phone-A');
      await addToday(phone, 'Phone-B');
      await settledSync(phone);
      // Unlike the report, the phone does not claim its upload succeeded.
      await expect(phone.sync.syncCheckIcon).toBeHidden();
      await settledSync(desktop);
      await settledSync(phone);

      expect(putStatuses.length).toBeGreaterThan(0);
      expect(putStatuses.every((status) => status === 412)).toBe(true);
      expect(await todayTitles(desktop)).toEqual(['Desk-Base']);
      expect(await todayTitles(phone)).toEqual(['Phone-A', 'Phone-B']);
    } finally {
      await desktop.close();
      await phone.close();
    }
  });
});

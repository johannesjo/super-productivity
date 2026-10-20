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
import { serveReleasedClientAssets } from '../../utils/released-client-assets';
import { waitForAppReady } from '../../utils/waits';

/**
 * #10916: a v19.1.0 desktop and a v19.2.0 phone sync over a file provider.
 * Tasks the phone adds to Today must reach the desktop and survive on the phone.
 */
// 'gzip-etag-' puts the folder behind the E2E server's mod_deflate (#10808).
const FOLDER_PREFIX = process.env.E2E_10916_FOLDER_PREFIX ?? 'e2e-';

test.describe('@webdav released mixed-version Today tasks (#10916)', () => {
  test.describe.configure({ mode: 'serial' });
  const releasedRoot = process.env.COMPAT_RELEASED_ROOT;
  test.skip(!releasedRoot, 'Set COMPAT_RELEASED_ROOT to the released bundles dir');

  let v191: Awaited<ReturnType<typeof serveReleasedClientAssets>>;
  let v192: Awaited<ReturnType<typeof serveReleasedClientAssets>>;
  let upgradable: Awaited<ReturnType<typeof serveReleasedClientAssets>>;
  test.beforeAll(async () => {
    const d191 = `${releasedRoot}/v19.1.0`;
    const d192 = `${releasedRoot}/v19.2.0`;
    v191 = await serveReleasedClientAssets({ old: d191, new: d191 }, 0);
    v192 = await serveReleasedClientAssets({ old: d192, new: d192 }, 0);
    upgradable = await serveReleasedClientAssets({ old: d192, new: d191 }, 0);
  });
  test.afterAll(async () => {
    await v191?.close();
    await v192?.close();
    await upgradable?.close();
  });

  // Phone origin: no cookie serves v19.1.0; the cookie upgrades it in place to
  // v19.2.0, keeping its IndexedDB, as a Play auto-update does.
  const upgradeInPlace = async (client: { page: Page }, url: string): Promise<void> => {
    await client.page
      .context()
      .addCookies([{ name: 'compat-release', value: 'old', url }]);
    await client.page.goto(`${url}/#/tag/TODAY/tasks`);
    await client.page.reload();
    await new WorkViewPage(client.page).waitForTaskList();
  };

  const openClient = async (
    browser: Browser,
    url: string,
  ): Promise<{
    page: Page;
    sync: SyncPage;
    work: WorkViewPage;
    close: () => Promise<void>;
  }> => {
    const { context, page } = await setupSyncClient(browser, url);
    const work = new WorkViewPage(page);
    await work.waitForTaskList();
    return {
      page,
      sync: new SyncPage(page),
      work,
      close: () => closeContextsSafely(context),
    };
  };

  const syncNow = async (client: { page: Page; sync: SyncPage }): Promise<void> => {
    await waitForStatePersistence(client.page);
    await client.sync.triggerSync();
    await waitForSyncComplete(client.page, client.sync);
  };

  const titles = async (page: Page, url: string): Promise<string[]> => {
    await page.goto(`${url}/#/tag/TODAY/tasks`);
    await new WorkViewPage(page).waitForTaskList();
    return page.locator('task .task-title').allInnerTexts();
  };

  test('phone (v19.2.0) Today tasks reach a v19.1.0 desktop and survive', async ({
    browser,
    request,
  }) => {
    test.slow();
    const folder = generateSyncFolderName(FOLDER_PREFIX + '10916');
    const config = { ...WEBDAV_CONFIG_TEMPLATE, syncFolderPath: `/${folder}` };
    await createSyncFolder(request, folder);

    const desktop = await openClient(browser, v191.url);
    const phone = await openClient(browser, v192.url);
    try {
      await desktop.sync.setupWebdavSync(config);
      await desktop.page.goto(`${v191.url}/#/tag/TODAY/tasks`);
      await desktop.work.waitForTaskList();
      await desktop.work.addTask('Desk-Base @today', false, 'Desk-Base');
      await syncNow(desktop);

      await phone.sync.setupWebdavSync(config);
      await syncNow(phone);
      expect(await titles(phone.page, v192.url)).toContain('Desk-Base');

      await phone.work.addTask('Phone-A @today', false, 'Phone-A');
      await phone.work.addTask('Phone-B @today', false, 'Phone-B');
      await syncNow(phone);

      await syncNow(desktop);
      const desktopTitles = await titles(desktop.page, v191.url);
      console.log('[10916] desktop after sync:', desktopTitles);

      await syncNow(phone);
      const phoneTitles = await titles(phone.page, v192.url);
      console.log('[10916] phone after second sync:', phoneTitles);

      expect(desktopTitles).toEqual(expect.arrayContaining(['Phone-A', 'Phone-B']));
      expect(phoneTitles).toEqual(expect.arrayContaining(['Phone-A', 'Phone-B']));
    } finally {
      await desktop.close();
      await phone.close();
    }
  });

  test('phone upgraded in place from v19.1.0 keeps Today tasks with a v19.1.0 desktop', async ({
    browser,
    request,
  }) => {
    test.slow();
    const folder = generateSyncFolderName(FOLDER_PREFIX + '10916-upg');
    const config = { ...WEBDAV_CONFIG_TEMPLATE, syncFolderPath: `/${folder}` };
    await createSyncFolder(request, folder);

    const desktop = await openClient(browser, v191.url);
    const phone = await openClient(browser, upgradable.url);
    try {
      await desktop.sync.setupWebdavSync(config);
      await desktop.page.goto(`${v191.url}/#/tag/TODAY/tasks`);
      await desktop.work.waitForTaskList();
      await desktop.work.addTask('Desk-Base @today', false, 'Desk-Base');
      await syncNow(desktop);

      await phone.sync.setupWebdavSync(config);
      await syncNow(phone);
      await phone.work.addTask('Phone-Old @today', false, 'Phone-Old');
      await syncNow(phone);
      await syncNow(desktop);
      expect(await titles(desktop.page, v191.url)).toContain('Phone-Old');
      await desktop.work.addTask('Desk-Two @today', false, 'Desk-Two');
      await syncNow(desktop);

      await upgradeInPlace(phone, upgradable.url);
      await syncNow(phone);
      console.log(
        '[10916-upg] phone after upgrade sync:',
        await titles(phone.page, upgradable.url),
      );

      await phone.work.addTask('Phone-A @today', false, 'Phone-A');
      await phone.work.addTask('Phone-B @today', false, 'Phone-B');
      await syncNow(phone);

      await syncNow(desktop);
      const desktopTitles = await titles(desktop.page, v191.url);
      console.log('[10916-upg] desktop after sync:', desktopTitles);

      await syncNow(phone);
      const phoneTitles = await titles(phone.page, upgradable.url);
      console.log('[10916-upg] phone after second sync:', phoneTitles);

      expect(desktopTitles).toEqual(expect.arrayContaining(['Phone-A', 'Phone-B']));
      expect(phoneTitles).toEqual(expect.arrayContaining(['Phone-A', 'Phone-B']));
    } finally {
      await desktop.close();
      await phone.close();
    }
  });

  test('v19.1.0 desktop with a pending local edit keeps the phone Today tasks', async ({
    browser,
    request,
  }) => {
    test.slow();
    const folder = generateSyncFolderName(FOLDER_PREFIX + '10916-pend');
    const config = { ...WEBDAV_CONFIG_TEMPLATE, syncFolderPath: `/${folder}` };
    await createSyncFolder(request, folder);

    const desktop = await openClient(browser, v191.url);
    const phone = await openClient(browser, v192.url);
    try {
      await desktop.sync.setupWebdavSync(config);
      await desktop.page.goto(`${v191.url}/#/tag/TODAY/tasks`);
      await desktop.work.waitForTaskList();
      await desktop.work.addTask('Desk-Base @today', false, 'Desk-Base');
      await syncNow(desktop);

      await phone.sync.setupWebdavSync(config);
      await syncNow(phone);

      await phone.work.addTask('Phone-A @today', false, 'Phone-A');
      await phone.work.addTask('Phone-B @today', false, 'Phone-B');
      await syncNow(phone);

      await desktop.page.goto(`${v191.url}/#/tag/TODAY/tasks`);
      await desktop.work.waitForTaskList();
      await desktop.work.addTask('Desk-Pending @today', false, 'Desk-Pending');
      await syncNow(desktop);
      const desktopTitles = await titles(desktop.page, v191.url);
      console.log('[10916-pend] desktop after sync:', desktopTitles);

      await syncNow(phone);
      const phoneTitles = await titles(phone.page, v192.url);
      console.log('[10916-pend] phone after second sync:', phoneTitles);

      expect(desktopTitles).toEqual(
        expect.arrayContaining(['Phone-A', 'Phone-B', 'Desk-Pending']),
      );
      expect(phoneTitles).toEqual(
        expect.arrayContaining(['Phone-A', 'Phone-B', 'Desk-Pending']),
      );
    } finally {
      await desktop.close();
      await phone.close();
    }
  });

  // A bare client: these scenarios expect failed uploads, so the shared helper's
  // strict dialog and close-time runtime-error guards do not apply.
  const openBareClient = async (
    browser: Browser,
    url: string,
  ): Promise<{
    page: Page;
    sync: SyncPage;
    work: WorkViewPage;
    close: () => Promise<void>;
  }> => {
    const context = await browser.newContext({
      baseURL: url,
      userAgent: 'PLAYWRIGHT WEBDAV-SYNC-CLIENT',
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => console.log('[10916-bare] pageerror:', e.message));
    page.on('dialog', (d) => {
      console.log('[10916-bare] dialog:', d.type(), d.message());
      void d.accept();
    });
    await page.addInitScript(() => {
      localStorage.setItem('SUP_ONBOARDING_PRESET_DONE', 'true');
      localStorage.setItem('SUP_ONBOARDING_HINTS_DONE', 'true');
      localStorage.setItem('SUP_IS_SHOW_TOUR', 'true');
      localStorage.setItem('SUP_EXAMPLE_TASKS_CREATED', 'true');
    });
    await page.goto('/');
    await waitForAppReady(page);
    const work = new WorkViewPage(page);
    await work.waitForTaskList();
    return { page, sync: new SyncPage(page), work, close: () => context.close() };
  };

  test('behind mod_deflate (#10808): phone Today tasks vs a v19.1.0 desktop', async ({
    browser,
    request,
  }) => {
    test.slow();
    const folder = generateSyncFolderName('gzip-etag-10916');
    const config = { ...WEBDAV_CONFIG_TEMPLATE, syncFolderPath: `/${folder}` };
    await createSyncFolder(request, folder);

    const desktop = await openBareClient(browser, v191.url);
    const phone = await openBareClient(browser, v192.url);
    const log: string[] = [];
    for (const [name, c] of [
      ['desk', desktop],
      ['phone', phone],
    ] as const) {
      c.page.on('response', (r) => {
        if (!r.url().includes(folder)) return;
        const m = r.request().method();
        if (m === 'PUT' || m === 'GET' || m === 'DELETE' || m === 'MOVE') {
          log.push(`${name} ${m} ${r.url().split(folder)[1]} -> ${r.status()}`);
        }
      });
    }
    const looseSync = async (
      name: string,
      c: { page: Page; sync: SyncPage },
    ): Promise<void> => {
      await waitForStatePersistence(c.page);
      log.push(`--- ${name} sync`);
      await c.sync.triggerSync();
      await c.page.waitForTimeout(6000);
      const snacks = await c.page.locator('.mat-mdc-snack-bar-container').allInnerTexts();
      log.push(
        `${name} end: check=${await c.sync.syncCheckIcon.isVisible()} err=${await c.sync.syncErrorIcon.isVisible()} snacks=${JSON.stringify(snacks)}`,
      );
    };
    const remoteTitles = async (): Promise<string[]> => {
      const r = await request.get(
        `${WEBDAV_CONFIG_TEMPLATE.baseUrl}${folder}/sync-data.json`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from('admin:admin').toString('base64')}`,
          },
        },
      );
      if (!r.ok()) return [`(status ${r.status()})`];
      const text = (await r.text()).replace(/^pf_\d+__/, '');
      const data = JSON.parse(text) as {
        syncVersion: number;
        state: { task: { entities: Record<string, { title: string }> } };
      };
      return [
        `v${data.syncVersion}`,
        ...Object.values(data.state.task.entities).map((t) => t.title),
      ];
    };
    try {
      await desktop.sync.setupWebdavSync(config);
      await desktop.page.goto(`${v191.url}/#/tag/TODAY/tasks`);
      await desktop.work.waitForTaskList();
      await desktop.work.addTask('Desk-Base @today', false, 'Desk-Base');
      await looseSync('desk', desktop);
      log.push(`remote: ${await remoteTitles()}`);

      await phone.sync.setupWebdavSync(config);
      await looseSync('phone', phone);
      log.push(`phone has: ${await titles(phone.page, v192.url)}`);

      await phone.work.addTask('Phone-A @today', false, 'Phone-A');
      await phone.work.addTask('Phone-B @today', false, 'Phone-B');
      await looseSync('phone', phone);
      log.push(`remote: ${await remoteTitles()}`);

      await looseSync('desk', desktop);
      const desktopTitles = await titles(desktop.page, v191.url);
      log.push(`desk has: ${desktopTitles}`);
      log.push(`remote: ${await remoteTitles()}`);

      await looseSync('phone', phone);
      const phoneTitles = await titles(phone.page, v192.url);
      log.push(`phone has: ${phoneTitles}`);
      log.push(`remote: ${await remoteTitles()}`);
      console.log('[10916-gzip]\n' + log.join('\n'));

      // #10808 blocks every upload, so the desktop never sees the phone's tasks,
      // but nothing is lost: the phone keeps them and shows no success.
      expect(desktopTitles).not.toContain('Phone-A');
      expect(phoneTitles).toEqual(expect.arrayContaining(['Phone-A', 'Phone-B']));
    } finally {
      console.log('[10916-gzip] log so far\n' + log.join('\n'));
      await desktop.close();
      await phone.close();
    }
  });

  test('phone on Surgical (v3) sync vs a v2 v19.1.0 desktop', async ({
    browser,
    request,
  }) => {
    test.slow();
    const folder = generateSyncFolderName(FOLDER_PREFIX + '10916-v3');
    const config = { ...WEBDAV_CONFIG_TEMPLATE, syncFolderPath: `/${folder}` };
    await createSyncFolder(request, folder);

    const desktop = await openBareClient(browser, v191.url);
    const phone = await openBareClient(browser, v192.url);
    const snack = async (p: Page): Promise<string[]> =>
      p.locator('.mat-mdc-snack-bar-container').allInnerTexts();
    try {
      await desktop.sync.setupWebdavSync({ ...config, isUseSplitSyncFiles: false });
      await desktop.page.goto(`${v191.url}/#/tag/TODAY/tasks`);
      await desktop.work.waitForTaskList();
      await desktop.work.addTask('Desk-Base @today', false, 'Desk-Base');
      await syncNow(desktop);

      await phone.sync.setupWebdavSync({ ...config, isUseSplitSyncFiles: true });
      await phone.sync.triggerSync();
      await phone.page.waitForTimeout(6000);
      console.log('[10916-v3] phone first sync snacks:', await snack(phone.page));
      await phone.work.addTask('Phone-A @today', false, 'Phone-A');
      await phone.work.addTask('Phone-B @today', false, 'Phone-B');
      await phone.sync.triggerSync();
      await phone.page.waitForTimeout(6000);
      console.log('[10916-v3] phone sync snacks:', await snack(phone.page));

      await desktop.sync.triggerSync();
      await desktop.page.waitForTimeout(6000);
      console.log('[10916-v3] desk sync snacks:', await snack(desktop.page));
      const desktopTitles = await titles(desktop.page, v191.url);
      console.log('[10916-v3] desktop after sync:', desktopTitles);
      await phone.sync.triggerSync();
      await phone.page.waitForTimeout(6000);
      const phoneTitles = await titles(phone.page, v192.url);
      console.log('[10916-v3] phone after second sync:', phoneTitles);
      expect(phoneTitles).toEqual(expect.arrayContaining(['Phone-A', 'Phone-B']));
    } finally {
      await desktop.close();
      await phone.close();
    }
  });
});

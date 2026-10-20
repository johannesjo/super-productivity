import { expect, type Page } from '@playwright/test';
import { test } from '../../fixtures/supersync.fixture';
import {
  createTestUser,
  getSuperSyncConfig,
  createSimulatedClient,
  closeClient,
  type SimulatedE2EClient,
} from '../../utils/supersync-helpers';
import { serveReleasedClientAssets } from '../../utils/released-client-assets';
import { WorkViewPage } from '../../pages/work-view.page';

/**
 * #10916: a v19.1.0 desktop and a v19.2.0 phone sync over SuperSync.
 * Tasks the phone adds to Today must reach the desktop and survive on the phone.
 */
test.describe('@supersync released mixed-version Today tasks (#10916)', () => {
  test.describe.configure({ mode: 'serial' });
  const releasedRoot = process.env.COMPAT_RELEASED_ROOT;
  test.skip(!releasedRoot, 'Set COMPAT_RELEASED_ROOT to the released bundles dir');

  let v191: Awaited<ReturnType<typeof serveReleasedClientAssets>>;
  let upgradable: Awaited<ReturnType<typeof serveReleasedClientAssets>>;
  test.beforeAll(async () => {
    const d191 = `${releasedRoot}/v19.1.0`;
    const d192 = `${releasedRoot}/v19.2.0`;
    v191 = await serveReleasedClientAssets({ old: d191, new: d191 }, 0);
    // No cookie serves v19.1.0; the cookie upgrades the origin in place.
    upgradable = await serveReleasedClientAssets({ old: d192, new: d191 }, 0);
  });
  test.afterAll(async () => {
    await v191?.close();
    await upgradable?.close();
  });

  const titles = async (client: SimulatedE2EClient): Promise<string[]> => {
    await client.page.goto('/#/tag/TODAY/tasks');
    await new WorkViewPage(client.page).waitForTaskList();
    // addTask prefixes titles with the client name; keep the test's own suffix.
    return (await client.page.locator('task .task-title').allInnerTexts()).map((t) =>
      t.replace(/^.*-\d+-/, ''),
    );
  };

  const mainScript = (page: Page): Promise<string | null> =>
    page.evaluate(
      () => document.querySelector('script[src^="main-"]')?.getAttribute('src') ?? null,
    );

  const addToday = async (client: SimulatedE2EClient, title: string): Promise<void> => {
    await client.page.goto('/#/tag/TODAY/tasks');
    await client.workView.waitForTaskList();
    await client.workView.addTask(`${title} @today`, false, title);
  };

  for (const fresh of [true, false]) {
    test(`phone ${fresh ? 'fresh on' : 'upgraded in place to'} v19.2.0 keeps Today tasks with a v19.1.0 desktop`, async ({
      browser,
      testRunId,
    }) => {
      test.slow();
      const clients: SimulatedE2EClient[] = [];
      try {
        const config = getSuperSyncConfig(await createTestUser(`${testRunId}-${fresh}`));
        const desktop = await createSimulatedClient(
          browser,
          v191.url,
          'Desk',
          testRunId,
          {
            serviceWorkers: 'block',
          },
        );
        clients.push(desktop);
        await desktop.sync.setupSuperSync(config);
        await addToday(desktop, 'Desk-Base');
        await desktop.sync.syncAndWait();

        const phone = await createSimulatedClient(
          browser,
          upgradable.url,
          'Phone',
          testRunId,
          { serviceWorkers: 'block' },
        );
        clients.push(phone);
        if (fresh) {
          await phone.context.addCookies([
            { name: 'compat-release', value: 'old', url: upgradable.url },
          ]);
          await phone.page.reload();
          await phone.workView.waitForTaskList();
        }
        await phone.sync.setupSuperSync(config);
        await phone.sync.syncAndWait();
        if (!fresh) {
          await addToday(phone, 'Phone-Old');
          await phone.sync.syncAndWait();
          await desktop.sync.syncAndWait();
          await addToday(desktop, 'Desk-Two');
          await desktop.sync.syncAndWait();
          await phone.context.addCookies([
            { name: 'compat-release', value: 'old', url: upgradable.url },
          ]);
          await phone.page.reload();
          await phone.workView.waitForTaskList();
          await phone.sync.syncAndWait();
        }
        // Entry bundles of the pinned v19.1.0 / v19.2.0 APK assets.
        expect(await mainScript(desktop.page)).toBe('main-W3ZD4DVY.js');
        expect(await mainScript(phone.page)).toBe('main-4BS4UVYJ.js');

        await addToday(phone, 'Phone-A');
        await addToday(phone, 'Phone-B');
        await phone.sync.syncAndWait();

        await desktop.sync.syncAndWait();
        const desktopTitles = await titles(desktop);
        console.log('[10916-ss] desktop after sync:', desktopTitles);

        await phone.sync.syncAndWait();
        const phoneTitles = await titles(phone);
        console.log('[10916-ss] phone after second sync:', phoneTitles);

        expect(desktopTitles).toEqual(expect.arrayContaining(['Phone-A', 'Phone-B']));
        expect(phoneTitles).toEqual(expect.arrayContaining(['Phone-A', 'Phone-B']));
      } finally {
        for (const client of clients) await closeClient(client);
      }
    });
  }
});

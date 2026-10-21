import { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/test.fixture';

// Plainspace has no E2E harness in this repo, so its integration API is stubbed
// here with a small stateful fake that answers with the real wire shapes (`SPTask`,
// `/me`). The server side is covered by Plainspace's own integration tests.
//
// Release 0 of the multi-user collaboration plan (#11007):
// - an offline poll is quiet and never asks to reconnect;
// - a revoked token (401) asks to reconnect on that provider;
// - reconnecting writes the new token only to providers holding the revoked one
//   (#8616), a provider of another host/account keeps its own;
// - "Copy invite link" copies the Space URL (share success snack, project menu).

const HOST = 'https://plainspace.org';
const OTHER_HOST = 'https://other-plainspace.e2e';
const SPACE = {
  id: 'space-alpha-id',
  name: 'Alpha',
  slug: 'alpha',
  memberDisplayName: 'Me',
  role: 'owner',
};

interface FakePlainspace {
  tokens: Map<string, string>;
  isTasksOffline: boolean;
  abortedTaskRequests: number;
  rejectedTaskRequests: number;
  taskRequestTokens: string[];
}

const installFakePlainspace = async (page: Page): Promise<FakePlainspace> => {
  const server: FakePlainspace = {
    // token → account email
    tokens: new Map([
      ['pat_old', 'me@e2e.test'],
      ['pat_other_account', 'other@e2e.test'],
    ]),
    isTasksOffline: false,
    abortedTaskRequests: 0,
    rejectedTaskRequests: 0,
    taskRequestTokens: [],
  };
  const cors = {
    ['access-control-allow-origin']: '*',
    ['access-control-allow-headers']: 'authorization, content-type',
    ['access-control-allow-methods']: 'GET, POST, PATCH, DELETE, OPTIONS',
  };
  const spTask = {
    id: 'task-1',
    title: 'Shared task',
    done: false,
    projectId: SPACE.id,
    projectName: SPACE.name,
    projectSlug: SPACE.slug,
    listId: 'list-1',
    url: `${HOST}/${SPACE.slug}/item/task-1`,
    createdAt: '2026-10-20T08:00:00.000Z',
    updatedAt: '2026-10-20T08:00:00.000Z',
    scheduledAt: null,
    isRecurring: false,
  };

  await page.route(
    /^https:\/\/(plainspace\.org|other-plainspace\.e2e)\/api\/integration\//,
    async (route) => {
      const req = route.request();
      if (req.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
      const path = new URL(req.url()).pathname.replace('/api/integration', '');
      if (path === '/tasks' && server.isTasksOffline) {
        server.abortedTaskRequests++;
        await route.abort('internetdisconnected');
        return;
      }
      const token = (req.headers()['authorization'] ?? '').replace(/^Bearer /, '');
      const email = server.tokens.get(token);
      if (!email) {
        if (path === '/tasks') {
          server.rejectedTaskRequests++;
        }
        await route.fulfill({
          status: 401,
          headers: cors,
          json: { error: 'Unauthorized' },
        });
        return;
      }
      if (path === '/me') {
        await route.fulfill({ headers: cors, json: { email, projects: [SPACE] } });
      } else if (path === '/tasks') {
        server.taskRequestTokens.push(token);
        await route.fulfill({ headers: cors, json: { tasks: [spTask] } });
      } else if (path === '/claimable-tasks') {
        await route.fulfill({ headers: cors, json: { tasks: [] } });
      } else {
        await route.fulfill({ status: 404, headers: cors, json: { error: 'Not found' } });
      }
    },
  );
  return server;
};

const readClipboard = (page: Page): Promise<string> =>
  page.evaluate(() => navigator.clipboard.readText());

test.describe('Plainspace Release 0', () => {
  test('offline stays quiet, a revoked token asks to reconnect, reconnect replaces only that token, invite link copies', async ({
    page,
    workViewPage,
    projectPage,
  }) => {
    test.setTimeout(120000);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: new URL(page.url()).origin,
    });
    await workViewPage.waitForTaskList();
    const server = await installFakePlainspace(page);
    // The first poll after sharing runs while Plainspace is unreachable.
    server.isTasksOffline = true;

    // Share a project: connect with the first token and link the existing space.
    await projectPage.createProject('Shared');
    await projectPage.openProjectContextMenu('Shared');
    await page.getByRole('menuitem', { name: /Collaborate on Plainspace/ }).click();
    const connectDialog = page.locator('plainspace-connect-dialog');
    await connectDialog.locator('input[type="password"]').fill('pat_old');
    await connectDialog.getByRole('button', { name: 'Connect', exact: true }).click();
    const picker = page.locator('plainspace-space-picker-dialog');
    // Item 4: the share dialog says what is stored on the Plainspace host.
    await expect(picker).toContainText(
      'Task titles, done state and scheduled times of shared tasks are stored on plainspace.org',
    );
    await picker.getByRole('button', { name: 'Link space' }).click();
    await expect(picker).toBeHidden();

    // Item 3: the share success snack copies the invite link (the Space URL).
    const successSnack = page.locator('mat-snack-bar-container', {
      hasText: 'Project shared on Plainspace',
    });
    await successSnack.getByRole('button', { name: 'Copy invite link' }).click();
    await expect
      .poll(() => readClipboard(page), { timeout: 5000 })
      .toBe(`${HOST}/${SPACE.slug}`);

    // Offline poll: no error snack, no reconnect notice.
    await expect
      .poll(() => server.abortedTaskRequests, { timeout: 30000 })
      .toBeGreaterThan(0);
    await page.locator('.e2e-toggle-issue-provider-panel').click();
    const reconnectNotice = activeTab(page).locator(
      'plainspace-reconnect-notice .callout',
    );
    await openProviderTab(page, SPACE.id);
    await expect(reconnectNotice).toHaveCount(0);
    await expect(
      page.locator('mat-snack-bar-container', { hasText: /Failed to poll/ }),
    ).toHaveCount(0);

    // Plainspace revokes the old token (a new one was minted elsewhere) and is
    // reachable again. Adding a second provider (another host and account)
    // restarts the poll timer.
    server.tokens.delete('pat_old');
    server.tokens.set('pat_new', 'me@e2e.test');
    server.isTasksOffline = false;
    await page.locator('issue-panel .mat-mdc-tab').last().click();
    await page.getByRole('button', { name: 'Plainspace', exact: true }).click();
    const editDialog = page.locator('dialog-edit-issue-provider');
    await editDialog.locator('input[id*="host"]').fill(OTHER_HOST);
    await editDialog.locator('input[id*="spaceId"]').fill('space-beta-id');
    await editDialog.locator('input[id*="token"]').fill('pat_other_account');
    await editDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(editDialog).toBeHidden();

    // Item 2: the 401 shows "reconnect" on the shared project's provider only.
    await expect
      .poll(() => server.rejectedTaskRequests, { timeout: 30000 })
      .toBeGreaterThan(0);
    await openProviderTab(page, SPACE.id);
    await expect(reconnectNotice).toBeVisible();
    await expect(reconnectNotice).toContainText('Plainspace rejected the connection');
    await expect(
      page.locator('mat-snack-bar-container', { hasText: /Failed to poll/ }),
    ).toHaveCount(0);

    // Item 1: reconnect with the new token.
    await reconnectNotice.getByRole('button', { name: 'Reconnect' }).click();
    await connectDialog.locator('input[type="password"]').fill('pat_new');
    await connectDialog.getByRole('button', { name: 'Connect', exact: true }).click();
    await expect(connectDialog).toBeHidden();
    await expect(reconnectNotice).toHaveCount(0);
    // The token change restarts polling; the next poll uses the new token.
    await expect
      .poll(() => server.taskRequestTokens.includes('pat_new'), { timeout: 30000 })
      .toBe(true);
    expect(server.taskRequestTokens).not.toContain('pat_other_account');

    expect(await providerToken(page, SPACE.id)).toBe('pat_new');
    expect(await providerToken(page, 'space-beta-id')).toBe('pat_other_account');

    // Item 3: the shared project's menu copies the invite link too.
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await projectPage.openProjectContextMenu('Shared');
    await page.getByRole('menuitem', { name: 'Copy invite link' }).click();
    await expect
      .poll(() => readClipboard(page), { timeout: 5000 })
      .toBe(`${HOST}/${SPACE.slug}`);
  });
});

const activeTab = (page: Page): ReturnType<Page['locator']> =>
  page.locator('issue-panel .mat-mdc-tab-body-active issue-provider-tab');

/** Selects the issue panel tab whose header names the given space id. */
const openProviderTab = async (page: Page, spaceId: string): Promise<void> => {
  const tabs = page.locator('issue-panel .mat-mdc-tab');
  const count = await tabs.count();
  // The last tab is the setup overview. Tab bodies animate, so give each tab a
  // moment to become the active one before moving on.
  for (let i = 0; i < count - 1; i++) {
    await tabs.nth(i).click();
    try {
      await expect(activeTab(page).locator('header .title')).toHaveText(spaceId, {
        timeout: 3000,
      });
      return;
    } catch {
      // not this tab
    }
  }
  throw new Error(`No issue panel tab for ${spaceId}`);
};

/** Reads a provider's stored token from its settings dialog, then closes it. */
const providerToken = async (page: Page, spaceId: string): Promise<string> => {
  await openProviderTab(page, spaceId);
  await activeTab(page).locator('header button').first().click();
  const dialog = page.locator('dialog-edit-issue-provider');
  const token = await dialog.locator('input[id*="token"]').inputValue();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  return token;
};

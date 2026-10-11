import type { Browser, Page } from '@playwright/test';
import { test, expect } from '../../fixtures/supersync.fixture';
import {
  closeClient,
  createSimulatedClient,
  createTestUser,
  deleteTask,
  getSuperSyncConfig,
  getTaskElement,
  SUPERSYNC_BASE_URL,
  waitForTask,
  type SimulatedE2EClient,
  type TestUser,
} from '../../utils/supersync-helpers';
import { waitForAppReady } from '../../utils/waits';

/**
 * Agent task capture: an assistant's create_task call becomes exactly one
 * Inbox task, on the device that imports it and on every other device via
 * normal sync. Needs the server started with CAPTURE_CONNECTOR_ENABLED=true
 * (docker-compose.supersync.yaml).
 *
 * Import runs are throttled to one a minute (agent-capture.service.ts), so a
 * run after an earlier one can take up to a minute to start.
 */

// Trailing `*`: requests carry an `?appVersion=` query, which a glob must match.
const CLAIM_ROUTE = '**/api/capture/claim*';
const ACK_ROUTE = '**/api/capture/ack*';
const IMPORT_TIMEOUT = 120_000;

const createTokenInSettings = async (client: SimulatedE2EClient): Promise<string> => {
  const dialog = await client.sync.openSuperSyncSettings();
  const capture = dialog.locator('agent-capture-settings');
  await capture.getByRole('button', { name: 'Let AI assistants add tasks' }).click();
  await capture.getByLabel('Assistant name').fill('E2E assistant');
  await capture.getByRole('button', { name: 'Create token' }).click();
  const tokenInput = capture.locator('[e2e="captureToken"]');
  await expect(tokenInput).toHaveValue(/^sp_cap_/);
  const token = await tokenInput.inputValue();
  // Cancel only discards the form: capture was switched on directly.
  await dialog.getByRole('button', { name: /cancel/i }).click();
  await expect(dialog).toBeHidden();
  return token;
};

const turnOffInSettings = async (client: SimulatedE2EClient): Promise<void> => {
  const dialog = await client.sync.openSuperSyncSettings();
  const capture = dialog.locator('agent-capture-settings');
  await capture.getByRole('button', { name: 'Turn off' }).click();
  await client.page.locator('dialog-confirm [e2e="confirmBtn"]').click();
  await expect(
    capture.getByRole('button', { name: 'Let AI assistants add tasks' }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: /cancel/i }).click();
  await expect(dialog).toBeHidden();
};

const postJson = (
  path: string,
  bearer: string,
  body: unknown,
  method = 'POST',
): Promise<Response> => {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json, text/event-stream');
  headers.set('Authorization', `Bearer ${bearer}`);
  return fetch(`${SUPERSYNC_BASE_URL}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
};

/** Returns the tool result; a refused token fails the test. */
const callCreateTask = async (
  token: string,
  title: string,
): Promise<{ isError?: boolean; content: Array<{ text: string }> }> => {
  const response = await postJson('/mcp', token, {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: 'create_task', arguments: { title } },
  });
  expect(response.status).toBe(200);
  const body = (await response.json()) as {
    result: { isError?: boolean; content: Array<{ text: string }> };
  };
  return body.result;
};

const captureTask = async (token: string, title: string): Promise<void> => {
  expect((await callCreateTask(token, title)).isError).toBeFalsy();
};

const pendingCount = async (user: TestUser): Promise<number> => {
  const response = await postJson('/api/capture/grants', user.token, undefined, 'GET');
  expect(response.status).toBe(200);
  const { grants } = (await response.json()) as {
    grants: Array<{ pendingCount: number }>;
  };
  return grants.reduce((sum, grant) => sum + grant.pendingCount, 0);
};

/** Pending drops to zero only when a device acked the item. */
const waitForNoPending = (user: TestUser): Promise<void> =>
  expect
    .poll(() => pendingCount(user), { timeout: IMPORT_TIMEOUT, intervals: [2_000] })
    .toBe(0);

const expireCaptureLeases = async (user: TestUser): Promise<void> => {
  const response = await fetch(
    `${SUPERSYNC_BASE_URL}/api/test/user/${user.userId}/expire-capture-leases`,
    { method: 'POST' },
  );
  expect(response.ok).toBe(true);
};

/**
 * Fails every ack, like a connection lost after the task was created. A 503,
 * not an abort: the provider retries network errors, so an abort could let a
 * later retry through once unrouted and the run would ack after all.
 */
const blockAcks = async (page: Page): Promise<{ tried: Promise<void> }> => {
  let tried: () => void = () => undefined;
  const firstAttempt = new Promise<void>((resolve) => (tried = resolve));
  await page.route(ACK_ROUTE, async (route) => {
    tried();
    await route.fulfill({ status: 503, json: { error: 'unavailable' } });
  });
  return { tried: firstAttempt };
};

/** Holds the next claim until released; later claims pass through. */
const holdNextClaim = async (
  page: Page,
): Promise<{ seen: Promise<void>; release: () => void }> => {
  let seen: () => void = () => undefined;
  let release: () => void = () => undefined;
  const seenPromise = new Promise<void>((resolve) => (seen = resolve));
  const released = new Promise<void>((resolve) => (release = resolve));
  let isHolding = false;
  await page.route(CLAIM_ROUTE, async (route) => {
    if (isHolding) return route.continue();
    isHolding = true;
    seen();
    await released;
    await route.continue();
  });
  return { seen: seenPromise, release };
};

const expectInboxTasks = async (
  client: SimulatedE2EClient,
  title: string,
  count: number,
  timeout = IMPORT_TIMEOUT,
): Promise<void> => {
  // Hash navigation, not page.goto: a reload would restart the import trigger.
  await client.page.evaluate(() => (location.hash = '#/project/INBOX_PROJECT/tasks'));
  if (count > 0) await waitForTask(client.page, title, timeout);
  await expect(getTaskElement(client, title)).toHaveCount(count, { timeout });
};

interface CaptureSetup {
  user: TestUser;
  client: SimulatedE2EClient;
  token: string;
}

/** A user with one client on SuperSync, capture switched on and one token. */
const setUpCapture = async (
  browser: Browser,
  baseURL: string,
  testRunId: string,
): Promise<CaptureSetup> => {
  const user = await createTestUser(testRunId);
  const client = await createSimulatedClient(browser, baseURL, 'A', testRunId);
  await client.sync.setupSuperSync(getSuperSyncConfig(user));
  const token = await createTokenInSettings(client);
  return { user, client, token };
};

const joinClient = async (
  browser: Browser,
  baseURL: string,
  testRunId: string,
  user: TestUser,
): Promise<SimulatedE2EClient> => {
  const client = await createSimulatedClient(browser, baseURL, 'B', testRunId);
  await client.sync.setupSuperSync(getSuperSyncConfig(user));
  await client.sync.syncAndWait();
  return client;
};

test.describe('@supersync Agent task capture', () => {
  let clientA: SimulatedE2EClient | null = null;
  let clientB: SimulatedE2EClient | null = null;

  test.beforeEach(() => {
    test.setTimeout(400_000);
    clientA = null;
    clientB = null;
  });

  test.afterEach(async () => {
    if (clientA) await closeClient(clientA);
    if (clientB) await closeClient(clientB);
  });

  test('an assistant task reaches the Inbox once, on every device', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    const { user, client: a, token } = await setUpCapture(browser, baseURL!, testRunId);
    clientA = a;
    const title = `Captured-${testRunId}`;
    await captureTask(token, title);

    // The import runs after a sync; the next sync uploads the new task.
    await a.sync.startSync();
    await expectInboxTasks(a, title, 1);
    await a.sync.syncAndWait();

    clientB = await joinClient(browser, baseURL!, testRunId, user);
    // B imports too (the key arrived by sync): the acked item must not return.
    await clientB.sync.syncAndWait();
    await expectInboxTasks(clientB, title, 1);
  });

  test('a restart between creating the task and its ack leaves one task', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    const { user, client: a, token } = await setUpCapture(browser, baseURL!, testRunId);
    clientA = a;
    const title = `Restart-${testRunId}`;
    const acks = await blockAcks(a.page);
    await captureTask(token, title);
    await a.sync.startSync();
    await expectInboxTasks(a, title, 1);
    await acks.tried;

    // The task and its receipt are persisted; the server still holds the item.
    await a.page.unroute(ACK_ROUTE);
    await a.page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await waitForAppReady(a.page);
    await a.sync.syncAndWait();
    await waitForNoPending(user);
    await expectInboxTasks(a, title, 1);

    await a.sync.syncAndWait();
    clientB = await joinClient(browser, baseURL!, testRunId, user);
    await expectInboxTasks(clientB, title, 1);
  });

  test('a task deleted before its lost ack is retried is not recreated', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    const { user, client: a, token } = await setUpCapture(browser, baseURL!, testRunId);
    clientA = a;
    const title = `LostAck-${testRunId}`;
    const acks = await blockAcks(a.page);
    await captureTask(token, title);
    await a.sync.startSync();
    await expectInboxTasks(a, title, 1);
    await acks.tried;

    await deleteTask(a, title);
    await expectInboxTasks(a, title, 0);
    await a.page.unroute(ACK_ROUTE);
    // The next run gets the same item back, finds the receipt and only acks.
    await a.sync.syncAndWait();
    await waitForNoPending(user);
    await a.sync.syncAndWait();
    await expectInboxTasks(a, title, 0);
  });

  test('a second device takes over an expired lease with a distinct task id', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    const { user, client: a, token } = await setUpCapture(browser, baseURL!, testRunId);
    clientA = a;
    const title = `Takeover-${testRunId}`;
    const acks = await blockAcks(a.page);
    await captureTask(token, title);
    await a.sync.startSync();
    await expectInboxTasks(a, title, 1);
    await acks.tried;
    await a.sync.syncAndWait();

    // A goes away still holding the lease; B finds nothing it may claim.
    await a.context.setOffline(true);
    clientB = await joinClient(browser, baseURL!, testRunId, user);
    expect(await pendingCount(user)).toBe(1);
    // Once the lease expires, B takes the item over.
    await expireCaptureLeases(user);
    await clientB.sync.startSync();
    await waitForNoPending(user);
    await clientB.sync.syncAndWait();
    // A's task arrived by sync, B's import has a new id: the documented
    // duplicate, as two tasks rather than one id created twice.
    await expectInboxTasks(clientB, title, 2);

    await a.context.setOffline(false);
    await a.page.unroute(ACK_ROUTE);
    await a.sync.syncAndWait();
    await expectInboxTasks(a, title, 2);
    expect(await a.sync.hasSyncError()).toBe(false);
    expect(await clientB.sync.hasSyncError()).toBe(false);
  });

  test('switching accounts during an import creates nothing', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    const { user, client: a, token } = await setUpCapture(browser, baseURL!, testRunId);
    clientA = a;
    const otherUser = await createTestUser(`${testRunId}-other`);
    const title = `Switch-${testRunId}`;
    const claim = await holdNextClaim(a.page);
    await captureTask(token, title);
    await a.sync.syncAndWait();
    await claim.seen;

    await a.sync.setupSuperSync(getSuperSyncConfig(otherUser));
    const abandoned = a.page.waitForEvent('console', {
      predicate: (msg) => msg.text().includes('Agent capture import abandoned'),
      timeout: IMPORT_TIMEOUT,
    });
    // The claim reaches the server for the first account only now.
    claim.release();
    await abandoned;

    await expectInboxTasks(a, title, 0);
    await a.sync.syncAndWait();
    await expectInboxTasks(a, title, 0);
    // Still held for the first account, whose devices import it later.
    expect(await pendingCount(user)).toBe(1);
  });

  test('a stale second device cannot switch capture back on', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    const { user, client: a } = await setUpCapture(browser, baseURL!, testRunId);
    clientA = a;
    // Uploads the key, so B gets it.
    await a.sync.syncAndWait();
    const b = await joinClient(browser, baseURL!, testRunId, user);
    clientB = b;

    // B claims with the key it still holds while A switches capture off.
    const claim = await holdNextClaim(b.page);
    await b.sync.syncAndWait();
    await claim.seen;
    await turnOffInSettings(a);
    const reRegister = b.page.waitForResponse(
      (res) => res.url().includes('/api/capture/key') && res.request().method() === 'PUT',
      { timeout: IMPORT_TIMEOUT },
    );
    claim.release();
    expect((await reRegister).status()).toBe(409);

    // A new token works only if some device registered a key again.
    const tokenResponse = await postJson('/api/capture/tokens', user.token, {
      clientName: 'Probe',
    });
    expect(tokenResponse.status).toBe(200);
    const { token } = (await tokenResponse.json()) as { token: string };
    const probe = await callCreateTask(token, `Probe-${testRunId}`);
    expect(probe.isError).toBe(true);
    expect(probe.content[0].text).toContain('switched off');

    await a.sync.syncAndWait();
    await b.sync.syncAndWait();
    const dialog = await b.sync.openSuperSyncSettings();
    await expect(
      dialog
        .locator('agent-capture-settings')
        .getByRole('button', { name: 'Let AI assistants add tasks' }),
    ).toBeVisible();
  });
});

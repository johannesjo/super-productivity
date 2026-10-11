import { test, expect } from '../../fixtures/supersync.fixture';
import {
  closeClient,
  createSimulatedClient,
  createTestUser,
  getSuperSyncConfig,
  getTaskElement,
  SUPERSYNC_BASE_URL,
  waitForTask,
  type SimulatedE2EClient,
} from '../../utils/supersync-helpers';

/**
 * Agent task capture: an assistant's create_task call becomes exactly one
 * Inbox task, on the device that imports it and on every other device via
 * normal sync. Needs the server started with CAPTURE_CONNECTOR_ENABLED=true
 * (docker-compose.supersync.yaml).
 */

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

const callCreateTask = async (token: string, title: string): Promise<void> => {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json, text/event-stream');
  headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${SUPERSYNC_BASE_URL}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'create_task', arguments: { title } },
    }),
  });
  expect(response.status).toBe(200);
  const body = (await response.json()) as { result?: { isError?: boolean } };
  expect(body.result?.isError).toBeFalsy();
};

const expectOneInboxTask = async (
  client: SimulatedE2EClient,
  title: string,
  timeout?: number,
): Promise<void> => {
  // Hash navigation, not page.goto: a reload would restart the import trigger.
  await client.page.evaluate(() => (location.hash = '#/project/INBOX_PROJECT/tasks'));
  await waitForTask(client.page, title, timeout);
  await expect(getTaskElement(client, title)).toHaveCount(1);
};

test.describe('@supersync Agent task capture', () => {
  test('an assistant task reaches the Inbox once, on every device', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    test.setTimeout(300_000);
    let clientA: SimulatedE2EClient | null = null;
    let clientB: SimulatedE2EClient | null = null;
    try {
      const syncConfig = getSuperSyncConfig(await createTestUser(testRunId));
      clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
      await clientA.sync.setupSuperSync(syncConfig);

      const token = await createTokenInSettings(clientA);
      const title = `Captured-${testRunId}`;
      await callCreateTask(token, title);

      // The import runs after a sync; the next sync uploads the new task.
      await clientA.sync.syncAndWait();
      // Runs are throttled to one a minute: a sync right after switching on
      // can take the slot, leaving this one to the trailing run.
      await expectOneInboxTask(clientA, title, 90_000);
      await clientA.sync.syncAndWait();

      clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
      await clientB.sync.setupSuperSync(syncConfig);
      await clientB.sync.syncAndWait();
      // B imports too (the key arrived by sync): the acked item must not return.
      await clientB.sync.syncAndWait();
      await expectOneInboxTask(clientB, title);
    } finally {
      if (clientA) await closeClient(clientA);
      if (clientB) await closeClient(clientB);
    }
  });
});

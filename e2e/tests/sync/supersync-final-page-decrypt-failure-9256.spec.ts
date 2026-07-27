import {
  CURRENT_SCHEMA_VERSION,
  SuperSyncDownloadOpsResponseSchema,
  SuperSyncUploadOpsRequestSchema,
  SuperSyncUploadOpsResponseSchema,
  type SuperSyncOperation,
} from '@sp/shared-schema';
import { encrypt } from '@sp/sync-core';
import { test, expect } from '../../fixtures/supersync.fixture';
import {
  SUPERSYNC_BASE_URL,
  closeClient,
  createSimulatedClient,
  createTestUser,
  getSuperSyncConfig,
  routeSuperSyncOps,
  unrouteSuperSyncOps,
  type SimulatedE2EClient,
} from '../../utils/supersync-helpers';

interface ObservedDownloadPage {
  sinceSeq: number;
  hasMore: boolean;
  opIds: string[];
}

type DownloadHistory = ReturnType<typeof SuperSyncDownloadOpsResponseSchema.parse>;

const authHeaders = (token: string): Headers => {
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');
  return headers;
};

const downloadServerHistory = async (token: string): Promise<DownloadHistory> => {
  const response = await fetch(
    `${SUPERSYNC_BASE_URL}/api/sync/ops?sinceSeq=0&limit=1000`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) {
    throw new Error(
      `Failed to inspect SuperSync history: ${response.status} ${await response.text()}`,
    );
  }
  return SuperSyncDownloadOpsResponseSchema.parse(await response.json());
};

const mergeHistoryClock = (history: DownloadHistory): Record<string, number> => {
  const merged: Record<string, number> = {};
  for (const { op } of history.ops) {
    for (const [clientId, counter] of Object.entries(op.vectorClock)) {
      merged[clientId] = Math.max(merged[clientId] ?? 0, counter);
    }
  }
  return merged;
};

const corruptAuthenticationTag = (ciphertext: string): string => {
  const bytes = Buffer.from(ciphertext, 'base64');
  if (bytes.length === 0) throw new Error('Cannot corrupt an empty ciphertext');
  bytes[bytes.length - 1] ^= 1;
  return bytes.toString('base64');
};

const uploadCorruptSuffix = async (
  token: string,
  testRunId: string,
  password: string,
  history: DownloadHistory,
): Promise<string> => {
  const clientId = `issue-9256-seed-${testRunId}`;
  const corruptOp: SuperSyncOperation = {
    id: crypto.randomUUID(),
    clientId,
    actionType: '[TIME_TRACKING] LWW Update',
    opType: 'UPD',
    entityType: 'TIME_TRACKING',
    entityId: 'PROJECT:issue-9256:2026-03-24',
    payload: corruptAuthenticationTag(
      await encrypt(JSON.stringify({ project: {}, tag: {} }), password),
    ),
    vectorClock: { ...mergeHistoryClock(history), [clientId]: 1 },
    timestamp: Date.now(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    isPayloadEncrypted: true,
  };
  const requestBody = SuperSyncUploadOpsRequestSchema.parse({
    clientId,
    ops: [corruptOp],
  });
  const response = await fetch(`${SUPERSYNC_BASE_URL}/api/sync/ops`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to seed corrupt operation: ${response.status} ${await response.text()}`,
    );
  }

  const result = SuperSyncUploadOpsResponseSchema.parse(await response.json());
  if (result.results.length !== 1 || result.results[0].accepted !== true) {
    throw new Error(`Server rejected corrupt fixture: ${JSON.stringify(result)}`);
  }
  return corruptOp.id;
};

const containsFailureSequence = (
  pages: ObservedDownloadPage[],
  validPageOpIds: string[],
  corruptOpId: string,
): boolean =>
  pages.some(
    (page, index) =>
      page.sinceSeq === 0 &&
      page.hasMore &&
      page.opIds.join() === validPageOpIds.join() &&
      pages[index + 1]?.hasMore === false &&
      pages[index + 1]?.opIds.join() === corruptOpId,
  );

test.describe('@supersync @encryption #9256 final-page decrypt failure', () => {
  test('correct password decrypts page 1 but an undecryptable final op blocks recovery', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    test.setTimeout(150000);
    let clientA: SimulatedE2EClient | null = null;
    let clientB: SimulatedE2EClient | null = null;

    try {
      const user = await createTestUser(testRunId);
      const encryptionPassword = `issue-9256-${testRunId}`;
      const syncConfig = {
        ...getSuperSyncConfig(user),
        isEncryptionEnabled: true,
        password: encryptionPassword,
      };
      const taskName = `Valid-page-task-${testRunId}`;

      // The valid first page is a genuine encrypted full-state operation produced
      // by the app, not a fabricated response or a mocked crypto service.
      clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
      await clientA.workView.waitForTaskList();
      await clientA.workView.addTask(taskName);
      await clientA.sync.setupSuperSync(syncConfig);
      await clientA.sync.syncAndWait();

      const validHistory = await downloadServerHistory(user.token);
      expect(validHistory.ops.length).toBeGreaterThan(0);
      expect(validHistory.hasMore).toBe(false);
      expect(
        validHistory.ops.every(
          ({ op }) => op.isPayloadEncrypted === true && typeof op.payload === 'string',
        ),
      ).toBe(true);
      expect(validHistory.ops.some(({ op }) => op.opType === 'SYNC_IMPORT')).toBe(true);
      const validPageOpIds = validHistory.ops.map(({ op }) => op.id);
      const corruptOpId = await uploadCorruptSuffix(
        user.token,
        testRunId,
        encryptionPassword,
        validHistory,
      );
      await closeClient(clientA);
      clientA = null;

      clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
      const observedPages: ObservedDownloadPage[] = [];
      await routeSuperSyncOps(clientB.page, async (route) => {
        if (route.request().method() !== 'GET') {
          await route.continue();
          return;
        }

        // Ask the real server to put the valid history and corrupt suffix on
        // separate pages. The response itself is passed through unchanged.
        const url = new URL(route.request().url());
        const sinceSeq = Number(url.searchParams.get('sinceSeq') ?? 0);
        url.searchParams.set('limit', String(validHistory.ops.length));
        const response = await route.fetch({ url: url.toString() });
        const body = SuperSyncDownloadOpsResponseSchema.parse(await response.json());
        observedPages.push({
          sinceSeq,
          hasMore: body.hasMore,
          opIds: body.ops.map(({ op }) => op.id),
        });
        await route.fulfill({ response });
      });

      await clientB.sync.setupSuperSync({
        ...syncConfig,
        waitForInitialSync: false,
      });

      const decryptErrorDialog = clientB.page.locator('dialog-handle-decrypt-error');
      await expect(decryptErrorDialog).toBeVisible({ timeout: 30000 });
      await expect(
        decryptErrorDialog.locator('h2:has-text("Decryption Failed")'),
      ).toBeVisible();
      await expect
        .poll(() => containsFailureSequence(observedPages, validPageOpIds, corruptOpId))
        .toBe(true);

      // Reaching page 2 proves the same password decrypted and validated page 1.
      // The failed complete download must not commit its valid prefix.
      expect(await clientB.sync.hasSyncError()).toBe(true);
      await expect(
        clientB.page.locator(`task:has-text("${taskName}")`),
      ).not.toBeVisible();

      // Match the reporter's deterministic retry: restart from page 1, then fail
      // on the same final operation without partially restoring the task.
      const retryPagesStart = observedPages.length;
      await decryptErrorDialog.locator('input[type="password"]').fill(encryptionPassword);
      await decryptErrorDialog
        .locator('button')
        .filter({ hasText: /retry.*decrypt/i })
        .click();

      await expect
        .poll(
          () =>
            containsFailureSequence(
              observedPages.slice(retryPagesStart),
              validPageOpIds,
              corruptOpId,
            ),
          { timeout: 30000 },
        )
        .toBe(true);
      await expect(decryptErrorDialog).toBeVisible({ timeout: 30000 });
      await expect(
        clientB.page.locator(`task:has-text("${taskName}")`),
      ).not.toBeVisible();
    } finally {
      if (clientA) await closeClient(clientA);
      if (clientB) {
        await unrouteSuperSyncOps(clientB.page).catch(() => {});
        await closeClient(clientB);
      }
    }
  });
});

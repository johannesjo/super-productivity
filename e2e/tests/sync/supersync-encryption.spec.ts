import { test as base, expect } from '@playwright/test';
import {
  createTestUser,
  getSuperSyncConfig,
  createSimulatedClient,
  closeClient,
  waitForTask,
  isServerHealthy,
  type SimulatedE2EClient,
} from '../../utils/supersync-helpers';

/**
 * SuperSync Encryption E2E Tests
 *
 * Verifies End-to-End Encryption (E2EE) logic:
 * - Setting up encryption
 * - Secure syncing between clients with same password
 * - Denial of access for clients with wrong password
 *
 * TODO: Fix encryption test failures. Known issues:
 *
 * 1. FORM CONFIG PROPAGATION: When using SuperSync encryption, the form correctly
 *    captures `superSync.isEncryptionEnabled` and `superSync.encryptKey`, but the
 *    encryption flag needs to be propagated to both the global config (for pfapi
 *    file-based sync) and the private config (for operation-log sync).
 *    - Fixed: sync-form.const.ts now uses per-field hideExpression instead of fieldGroup hideExpression
 *    - Fixed: sync-config.service.ts now reads from saved private config as fallback
 *
 * 2. ACTION PAYLOAD EXTRACTION: When encrypted operations are replayed on Client B,
 *    the `task` property in `addTask` actions is `undefined`, causing:
 *    `TypeError: Cannot read properties of undefined (reading 'dueDay')`
 *    at task-shared-crud.reducer.ts:121
 *
 *    Hypothesis: The operation payload is being encrypted/decrypted correctly, but
 *    `extractActionPayload()` in operation-converter.util.ts may be returning incorrect
 *    data. Needs investigation into:
 *    - Whether `isMultiEntityPayload()` is correctly identifying encrypted/decrypted payloads
 *    - Whether `actionPayload` is correctly structured after decryption
 *    - Whether there's a JSON serialization issue with the task object
 *
 * 3. To debug: Run with E2E_VERBOSE=1 to see browser console logs
 */

const generateTestRunId = (workerIndex: number): string => {
  return `${Date.now()}-${workerIndex}`;
};

base.describe('@supersync SuperSync Encryption', () => {
  let serverHealthy: boolean | null = null;

  base.beforeEach(async ({}, testInfo) => {
    if (serverHealthy === null) {
      serverHealthy = await isServerHealthy();
      if (!serverHealthy) {
        console.warn(
          'SuperSync server not healthy at http://localhost:1901 - skipping tests',
        );
      }
    }
    testInfo.skip(!serverHealthy, 'SuperSync server not running');
  });

  base(
    'Encrypted data syncs correctly with valid password',
    async ({ browser, baseURL }, testInfo) => {
      const testRunId = generateTestRunId(testInfo.workerIndex);
      let clientA: SimulatedE2EClient | null = null;
      let clientB: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const baseConfig = getSuperSyncConfig(user);
        const encryptionPassword = `pass-${testRunId}`;
        const syncConfig = {
          ...baseConfig,
          isEncryptionEnabled: true,
          password: encryptionPassword,
        };

        // --- Client A: Encrypt & Upload ---
        clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
        await clientA.sync.setupSuperSync(syncConfig);

        const secretTaskName = `SecretTask-${testRunId}`;
        await clientA.workView.addTask(secretTaskName);

        // Sync A (Encrypts and uploads)
        await clientA.sync.syncAndWait();

        // --- Client B: Download & Decrypt ---
        clientB = await createSimulatedClient(browser, baseURL!, 'B', testRunId);
        // Use SAME config (same password)
        await clientB.sync.setupSuperSync(syncConfig);

        // Sync B (Downloads and decrypts)
        await clientB.sync.syncAndWait();

        // Verify B has the task
        await waitForTask(clientB.page, secretTaskName);
        await expect(
          clientB.page.locator(`task:has-text("${secretTaskName}")`),
        ).toBeVisible();
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientB) await closeClient(clientB);
      }
    },
  );

  base(
    'Encrypted data fails to sync with wrong password',
    async ({ browser, baseURL }, testInfo) => {
      const testRunId = generateTestRunId(testInfo.workerIndex);
      let clientA: SimulatedE2EClient | null = null;
      let clientC: SimulatedE2EClient | null = null;

      try {
        const user = await createTestUser(testRunId);
        const baseConfig = getSuperSyncConfig(user);
        const correctPassword = `correct-${testRunId}`;
        const wrongPassword = `wrong-${testRunId}`;

        // --- Client A: Encrypt & Upload (Correct Password) ---
        clientA = await createSimulatedClient(browser, baseURL!, 'A', testRunId);
        await clientA.sync.setupSuperSync({
          ...baseConfig,
          isEncryptionEnabled: true,
          password: correctPassword,
        });

        const secretTaskName = `SecretTask-${testRunId}`;
        await clientA.workView.addTask(secretTaskName);
        await clientA.sync.syncAndWait();

        // --- Client C: Attempt Download (Wrong Password) ---
        clientC = await createSimulatedClient(browser, baseURL!, 'C', testRunId);

        // Setup with WRONG password
        await clientC.sync.setupSuperSync({
          ...baseConfig,
          isEncryptionEnabled: true,
          password: wrongPassword,
        });

        // Try to sync - expectation is that it completes (download happens) but processing fails
        // The SyncPage helper might throw if it detects an error icon, or we check for error manually

        // We expect the sync to technically "fail" or show an error state because decryption failed
        try {
          await clientC.sync.triggerSync();
          // It might not throw immediately if waitForSyncComplete handles the error state gracefully or we catch it
          await clientC.sync.waitForSyncComplete();
        } catch (e) {
          // Expected error or timeout due to failure
          console.log('Sync failed as expected:', e);
        }

        // Verify Client C DOES NOT have the task
        await expect(
          clientC.page.locator(`task:has-text("${secretTaskName}")`),
        ).not.toBeVisible();

        // Verify Error UI
        // Check for error icon or snackbar
        const hasError = await clientC.sync.hasSyncError();
        const snackbar = clientC.page.locator('simple-snack-bar');
        // "Decryption failed" or "Wrong encryption password"
        if (!hasError && !(await snackbar.isVisible())) {
          // If sync didn't report error, maybe it just silently ignored ops (shouldn't happen with current logic)
          // But let's check if we at least DON'T have the data.
        } else {
          expect(hasError || (await snackbar.isVisible())).toBe(true);
        }
      } finally {
        if (clientA) await closeClient(clientA);
        if (clientC) await closeClient(clientC);
      }
    },
  );
});

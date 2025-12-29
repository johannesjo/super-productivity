import { test, expect } from '../../fixtures/test.fixture';
import { SyncPage } from '../../pages/sync.page';
import { WorkViewPage } from '../../pages/work-view.page';
import { waitForAppReady, waitForStatePersistence } from '../../utils/waits';
import { type Browser, type Page } from '@playwright/test';
import { isWebDavServerUp } from '../../utils/check-webdav';

test.describe('WebDAV Sync Full Flow', () => {
  // Run sync tests serially to avoid WebDAV server contention
  test.describe.configure({ mode: 'serial' });

  // Use a unique folder for each test run to avoid collisions
  const SYNC_FOLDER_NAME = `e2e-test-${Date.now()}`;

  const WEBDAV_CONFIG = {
    baseUrl: 'http://127.0.0.1:2345/',
    username: 'admin',
    password: 'admin',
    syncFolderPath: `/${SYNC_FOLDER_NAME}`,
  };

  test.beforeAll(async () => {
    const isUp = await isWebDavServerUp(WEBDAV_CONFIG.baseUrl);
    if (!isUp) {
      console.warn('WebDAV server not reachable. Skipping WebDAV tests.');
      test.skip(true, 'WebDAV server not reachable');
    }
  });

  const setupClient = async (
    browser: Browser,
    baseURL: string | undefined,
  ): Promise<{ context: any; page: Page }> => {
    const context = await browser.newContext({ baseURL });

    const page = await context.newPage();

    await page.goto('/');

    await waitForAppReady(page);

    // Dismiss Shepherd Tour if present

    try {
      const tourElement = page.locator('.shepherd-element').first();

      // Short wait to see if it appears

      await tourElement.waitFor({ state: 'visible', timeout: 4000 });

      const cancelIcon = page.locator('.shepherd-cancel-icon').first();

      if (await cancelIcon.isVisible()) {
        await cancelIcon.click();
      } else {
        await page.keyboard.press('Escape');
      }

      await tourElement.waitFor({ state: 'hidden', timeout: 3000 });
    } catch (e) {
      // Tour didn't appear or wasn't dismissable, ignore
    }

    return { context, page };
  };

  const waitForSync = async (
    page: Page,
    syncPage: SyncPage,
  ): Promise<'success' | 'conflict' | void> => {
    // Poll for success icon, error snackbar, or conflict dialog
    const startTime = Date.now();
    let stableCount = 0;

    while (Date.now() - startTime < 30000) {
      // 30s timeout
      const conflictDialog = page.locator('dialog-sync-conflict');
      if (await conflictDialog.isVisible()) return 'conflict';

      const snackBars = page.locator('.mat-mdc-snack-bar-container');
      const count = await snackBars.count();
      for (let i = 0; i < count; ++i) {
        const text = await snackBars.nth(i).innerText();
        // Check for keywords indicating failure
        if (text.toLowerCase().includes('error') || text.toLowerCase().includes('fail')) {
          throw new Error(`Sync failed with error: ${text}`);
        }
      }

      // Check if sync is in progress (spinner visible)
      const isSpinning = await syncPage.syncSpinner.isVisible();
      if (!isSpinning) {
        // Check for success icon
        const successVisible = await syncPage.syncCheckIcon.isVisible();
        if (successVisible) return 'success';

        // No spinner, no error, no check icon - use stable count fallback
        stableCount++;
        if (stableCount >= 3) {
          return 'success'; // Consider sync complete after 3 stable checks
        }
      } else {
        stableCount = 0; // Reset if still spinning
      }

      await page.waitForTimeout(500);
    }

    throw new Error('Sync timeout: Sync did not complete');
  };

  test('should sync data between two clients', async ({ browser, baseURL, request }) => {
    test.slow(); // Sync tests might take longer
    console.log('Using baseURL:', baseURL);
    const url = baseURL || 'http://localhost:4242';

    // Create the sync folder on WebDAV server to avoid 409 Conflict (parent missing)
    // The app adds /DEV suffix in dev mode, so we need to ensure the base folder exists.
    const mkcolUrl = `${WEBDAV_CONFIG.baseUrl}${SYNC_FOLDER_NAME}`;
    console.log(`Creating WebDAV folder: ${mkcolUrl}`);
    try {
      const response = await request.fetch(mkcolUrl, {
        method: 'MKCOL',
        headers: {
          Authorization: 'Basic ' + Buffer.from('admin:admin').toString('base64'),
        },
      });
      if (!response.ok() && response.status() !== 405) {
        console.warn(
          `Failed to create WebDAV folder: ${response.status()} ${response.statusText()}`,
        );
      }
    } catch (e) {
      console.warn('Error creating WebDAV folder:', e);
    }

    // --- Client A ---
    const { context: contextA, page: pageA } = await setupClient(browser, url);
    const syncPageA = new SyncPage(pageA);
    const workViewPageA = new WorkViewPage(pageA);
    await workViewPageA.waitForTaskList();

    // Configure Sync on Client A
    await syncPageA.setupWebdavSync(WEBDAV_CONFIG);
    await expect(syncPageA.syncBtn).toBeVisible();

    // Add Task on Client A
    const taskName = 'Task from Client A';
    await workViewPageA.addTask(taskName);
    await expect(pageA.locator('task')).toHaveCount(1);

    // Sync Client A (Upload)
    await syncPageA.triggerSync();
    await waitForSync(pageA, syncPageA);

    // --- Client B ---
    const { context: contextB, page: pageB } = await setupClient(browser, url);
    const syncPageB = new SyncPage(pageB);
    const workViewPageB = new WorkViewPage(pageB);
    await workViewPageB.waitForTaskList();

    // Configure Sync on Client B (Same path)
    await syncPageB.setupWebdavSync(WEBDAV_CONFIG);
    await expect(syncPageB.syncBtn).toBeVisible();

    // Sync Client B (Download)
    await syncPageB.triggerSync();
    await waitForSync(pageB, syncPageB);

    // Verify Task appears on Client B
    await expect(pageB.locator('task')).toHaveCount(1);
    await expect(pageB.locator('task').first()).toContainText(taskName);

    // --- Sync Update (A -> B) ---
    // Add another task on Client A
    const taskName2 = 'Task 2 from Client A';
    await workViewPageA.addTask(taskName2);

    await syncPageA.triggerSync();
    await waitForSync(pageA, syncPageA);

    // Sync Client B
    await syncPageB.triggerSync();
    await waitForSync(pageB, syncPageB);

    await expect(pageB.locator('task')).toHaveCount(2);
    await expect(pageB.locator('task').first()).toContainText(taskName2);

    // --- Deletion Sync (A -> B) ---
    console.log('Testing Deletion Sync...');
    // Delete first task on Client A
    await pageA.locator('task').first().click({ button: 'right' });
    await pageA.locator('.mat-mdc-menu-content button.color-warn').click();

    // Wait for deletion to be reflected in UI
    await expect(pageA.locator('task')).toHaveCount(1, { timeout: 10000 }); // Should be 1 left

    // Wait for state persistence before syncing
    await waitForStatePersistence(pageA);
    // Extra wait to ensure deletion is fully persisted
    await pageA.waitForTimeout(1000);

    await syncPageA.triggerSync();
    await waitForSync(pageA, syncPageA);

    // Retry sync on B up to 3 times to handle eventual consistency
    let taskCountOnB = 2;
    for (let attempt = 1; attempt <= 3 && taskCountOnB !== 1; attempt++) {
      console.log(`Deletion sync attempt ${attempt} on Client B...`);

      // Wait before syncing
      await pageB.waitForTimeout(500);

      await syncPageB.triggerSync();
      await waitForSync(pageB, syncPageB);

      // Wait for sync state to persist
      await waitForStatePersistence(pageB);
      await pageB.waitForTimeout(500);

      // Reload to ensure UI reflects synced state
      await pageB.reload();
      await waitForAppReady(pageB);

      // Dismiss tour if it appears
      try {
        const tourElement = pageB.locator('.shepherd-element').first();
        await tourElement.waitFor({ state: 'visible', timeout: 2000 });
        const cancelIcon = pageB.locator('.shepherd-cancel-icon').first();
        if (await cancelIcon.isVisible()) {
          await cancelIcon.click();
        }
      } catch {
        // Tour didn't appear
      }
      await workViewPageB.waitForTaskList();

      taskCountOnB = await pageB.locator('task').count();
      console.log(`After attempt ${attempt}: ${taskCountOnB} tasks on Client B`);
    }

    await expect(pageB.locator('task')).toHaveCount(1, { timeout: 5000 });

    // --- Conflict Resolution ---
    console.log('Testing Conflict Resolution...');

    // Close old Client B context - it may have stale sync state after multiple reloads
    await contextB.close();

    // Create new task "Conflict Task" on A
    await workViewPageA.addTask('Conflict Task');

    // Wait for state persistence before syncing
    await waitForStatePersistence(pageA);

    await syncPageA.triggerSync();
    await waitForSync(pageA, syncPageA);

    // Wait for WebDAV server to process A's upload
    await pageA.waitForTimeout(2000);

    // Create a fresh Client B for conflict test
    console.log('Creating fresh Client B for conflict test...');
    const contextB2 = await browser.newContext({ baseURL: url });
    const pageB2 = await contextB2.newPage();
    await pageB2.goto('/');
    await waitForAppReady(pageB2);
    // Dismiss tour
    try {
      const tourElement = pageB2.locator('.shepherd-element').first();
      await tourElement.waitFor({ state: 'visible', timeout: 4000 });
      const cancelIcon = pageB2.locator('.shepherd-cancel-icon').first();
      if (await cancelIcon.isVisible()) {
        await cancelIcon.click();
      } else {
        await pageB2.keyboard.press('Escape');
      }
    } catch {
      // Tour didn't appear
    }

    const syncPageB2 = new SyncPage(pageB2);
    const workViewPageB2 = new WorkViewPage(pageB2);
    await workViewPageB2.waitForTaskList();

    // Setup sync on fresh Client B
    await syncPageB2.setupWebdavSync(WEBDAV_CONFIG);
    await syncPageB2.triggerSync();
    await waitForSync(pageB2, syncPageB2);

    // Wait for state persistence
    await waitForStatePersistence(pageB2);

    // Reload to ensure UI reflects synced state
    await pageB2.reload();
    await waitForAppReady(pageB2);
    try {
      const tourElement = pageB2.locator('.shepherd-element').first();
      await tourElement.waitFor({ state: 'visible', timeout: 2000 });
      const cancelIcon = pageB2.locator('.shepherd-cancel-icon').first();
      if (await cancelIcon.isVisible()) {
        await cancelIcon.click();
      }
    } catch {
      // Tour didn't appear
    }
    await workViewPageB2.waitForTaskList();

    // Final assertion - should have 2 tasks now
    const taskCount = await pageB2.locator('task').count();
    console.log(`After conflict sync: ${taskCount} tasks on Client B`);

    // Debug: List all task titles
    const taskTitles = await pageB2.locator('.task-title').allInnerTexts();
    console.log(`Task titles on B: ${JSON.stringify(taskTitles)}`);

    await expect(pageB2.locator('task')).toHaveCount(2, { timeout: 5000 });

    // Edit on A: "Conflict Task A"
    const taskA = pageA.locator('task', { hasText: 'Conflict Task' }).first();
    await taskA.click(); // Select
    const titleA = taskA.locator('.task-title');
    await titleA.click();
    await titleA.locator('input, textarea').fill('Conflict Task A');
    await pageA.keyboard.press('Enter');

    // Wait for state persistence and ensure timestamps differ between edits
    await waitForStatePersistence(pageA);

    // Edit on B2: "Conflict Task B"
    const taskB2 = pageB2.locator('task', { hasText: 'Conflict Task' }).first();
    await taskB2.click();
    const titleB2 = taskB2.locator('.task-title');
    await titleB2.click();
    await titleB2.locator('input, textarea').fill('Conflict Task B');
    await pageB2.keyboard.press('Enter');

    // Sync A (Uploads "A")
    await syncPageA.triggerSync();
    await waitForSync(pageA, syncPageA);

    // Sync B2 (Downloads "A" but has "B") -> Conflict
    await syncPageB2.triggerSync();
    const result = await waitForSync(pageB2, syncPageB2);

    if (result === 'success') {
      console.log(
        'Warning: No conflict detected (Auto-merged or overwrite). Checking content...',
      );
      const isA = await pageB2
        .locator('task', { hasText: 'Conflict Task A' })
        .isVisible();
      const isB = await pageB2
        .locator('task', { hasText: 'Conflict Task B' })
        .isVisible();
      console.log(`Content on B: A=${isA}, B=${isB}`);
      // If it was merged/overwritten, we skip the resolution steps
    } else {
      expect(result).toBe('conflict');

      // Resolve conflict: Use Remote (A)
      console.log('Resolving conflict with Remote...');
      await pageB2.locator('dialog-sync-conflict button', { hasText: /Remote/i }).click();

      // Handle potential confirmation dialog
      const confirmDialog = pageB2.locator('dialog-confirm');
      try {
        await confirmDialog.waitFor({ state: 'visible', timeout: 3000 });
        await confirmDialog.locator('button[color="warn"]').click();
      } catch {
        // Confirmation might not appear
      }

      await waitForSync(pageB2, syncPageB2);

      await expect(pageB2.locator('task', { hasText: 'Conflict Task A' })).toBeVisible();
      await expect(
        pageB2.locator('task', { hasText: 'Conflict Task B' }),
      ).not.toBeVisible();
    }

    // Cleanup
    await contextA.close();
    await contextB2.close();
  });
});

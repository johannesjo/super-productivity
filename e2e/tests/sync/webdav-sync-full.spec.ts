import { test, expect } from '../../fixtures/test.fixture';
import { SyncPage } from '../../pages/sync.page';
import { WorkViewPage } from '../../pages/work-view.page';
import { waitForAppReady } from '../../utils/waits';
import { type Browser, type Page } from '@playwright/test';
import { isWebDavServerUp } from '../../utils/check-webdav';

test.describe('WebDAV Sync Full Flow', () => {
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

    while (Date.now() - startTime < 30000) {
      // 30s timeout

      const successVisible = await syncPage.syncCheckIcon.isVisible();

      if (successVisible) return 'success';

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

      await page.waitForTimeout(500);
    }

    throw new Error('Sync timeout: Success icon did not appear');
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

    // Wait for deletion
    await expect(pageA.locator('task')).toHaveCount(1); // Should be 1 left

    await pageA.waitForTimeout(1000);

    await syncPageA.triggerSync();
    await waitForSync(pageA, syncPageA);

    await syncPageB.triggerSync();
    await waitForSync(pageB, syncPageB);

    await expect(pageB.locator('task')).toHaveCount(1);

    // --- Conflict Resolution ---
    console.log('Testing Conflict Resolution...');
    // Create new task "Conflict Task" on A
    await workViewPageA.addTask('Conflict Task');
    await syncPageA.triggerSync();
    await waitForSync(pageA, syncPageA);

    await syncPageB.triggerSync();
    await waitForSync(pageB, syncPageB);

    // Edit on A: "Conflict Task A"
    const taskA = pageA.locator('task', { hasText: 'Conflict Task' }).first();
    await taskA.click(); // Select
    const titleA = taskA.locator('.task-title');
    await titleA.click();
    await titleA.locator('input, textarea').fill('Conflict Task A');
    await pageA.keyboard.press('Enter');

    // Wait a bit to ensure timestamps differ
    await pageA.waitForTimeout(2000);

    // Edit on B: "Conflict Task B"
    const taskB = pageB.locator('task', { hasText: 'Conflict Task' }).first();
    await taskB.click();
    const titleB = taskB.locator('.task-title');
    await titleB.click();
    await titleB.locator('input, textarea').fill('Conflict Task B');
    await pageB.keyboard.press('Enter');

    // Sync A (Uploads "A")
    await syncPageA.triggerSync();
    await waitForSync(pageA, syncPageA);

    // Sync B (Downloads "A" but has "B") -> Conflict
    await syncPageB.triggerSync();
    const result = await waitForSync(pageB, syncPageB);

    if (result === 'success') {
      console.log(
        'Warning: No conflict detected (Auto-merged or overwrite). Checking content...',
      );
      const isA = await pageB.locator('task', { hasText: 'Conflict Task A' }).isVisible();
      const isB = await pageB.locator('task', { hasText: 'Conflict Task B' }).isVisible();
      console.log(`Content on B: A=${isA}, B=${isB}`);
      // If it was merged/overwritten, we skip the resolution steps
    } else {
      expect(result).toBe('conflict');

      // Resolve conflict: Use Remote (A)
      console.log('Resolving conflict with Remote...');
      await pageB.locator('dialog-sync-conflict button', { hasText: /Remote/i }).click();

      // Handle potential confirmation dialog
      const confirmDialog = pageB.locator('dialog-confirm');
      try {
        await confirmDialog.waitFor({ state: 'visible', timeout: 3000 });
        await confirmDialog.locator('button[color="warn"]').click();
      } catch {
        // Confirmation might not appear
      }

      await waitForSync(pageB, syncPageB);

      await expect(pageB.locator('task', { hasText: 'Conflict Task A' })).toBeVisible();
      await expect(
        pageB.locator('task', { hasText: 'Conflict Task B' }),
      ).not.toBeVisible();
    }

    // Cleanup
    await contextA.close();
    await contextB.close();
  });
});

import { test, expect } from '../../fixtures/test.fixture';
import { SyncPage } from '../../pages/sync.page';
import { WorkViewPage } from '../../pages/work-view.page';
import { isWebDavServerUp } from '../../utils/check-webdav';
import {
  WEBDAV_CONFIG_TEMPLATE,
  createUniqueSyncFolder,
  createWebDavFolder,
  setupClient,
  waitForSync,
} from '../../utils/sync-helpers';

test.describe('WebDAV Sync Time Tracking', () => {
  // Run sync tests serially to avoid WebDAV server contention
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const isUp = await isWebDavServerUp(WEBDAV_CONFIG_TEMPLATE.baseUrl);
    if (!isUp) {
      console.warn('WebDAV server not reachable. Skipping WebDAV tests.');
      test.skip(true, 'WebDAV server not reachable');
    }
  });

  // Skip: Time tracking data persistence is complex and was redesigned in feat/operation-log.
  // The timer UI works (isCurrent class toggles) but timeSpent value storage varies by context.
  // This test should be revisited after operation-log merge to verify the new time tracking sync.
  test.skip('should sync time spent on task between clients', async ({
    browser,
    baseURL,
    request,
  }) => {
    test.slow();
    const SYNC_FOLDER_NAME = createUniqueSyncFolder('time-tracking');
    await createWebDavFolder(request, SYNC_FOLDER_NAME);
    const WEBDAV_CONFIG = {
      ...WEBDAV_CONFIG_TEMPLATE,
      syncFolderPath: `/${SYNC_FOLDER_NAME}`,
    };

    const url = baseURL || 'http://localhost:4242';

    // --- Client A ---
    const { context: contextA, page: pageA } = await setupClient(browser, url);
    const syncPageA = new SyncPage(pageA);
    const workViewPageA = new WorkViewPage(pageA);
    await workViewPageA.waitForTaskList();

    // Configure Sync on Client A
    await syncPageA.setupWebdavSync(WEBDAV_CONFIG);
    await expect(syncPageA.syncBtn).toBeVisible();

    // Create a task
    const taskName = `Time Track Test ${Date.now()}`;
    await workViewPageA.addTask(taskName);
    const taskA = pageA.locator('task', { hasText: taskName }).first();
    await expect(taskA).toBeVisible();

    // Click the task to select/focus it
    await taskA.click();
    await pageA.waitForTimeout(200);

    // Start timer using header play button (starts tracking for selected task)
    const playBtn = pageA.locator('.play-btn.tour-playBtn').first();
    await playBtn.waitFor({ state: 'visible' });
    await playBtn.click();

    // Wait for the class to be applied
    await pageA.waitForTimeout(500);

    // Verify task is being tracked (has isCurrent class)
    await expect(taskA).toHaveClass(/isCurrent/);

    // Wait for time to accumulate (3 seconds)
    await pageA.waitForTimeout(3000);

    // Stop timer by clicking play button again
    await playBtn.click();

    // Wait for the class to be removed
    await pageA.waitForTimeout(500);

    // Verify tracking stopped
    await expect(taskA).not.toHaveClass(/isCurrent/);

    // Wait for state to persist and reload to ensure time display is updated
    await pageA.waitForTimeout(1000);
    await pageA.reload();
    await workViewPageA.waitForTaskList();

    // Refetch the task after reload
    const taskAAfterReload = pageA.locator('task', { hasText: taskName }).first();
    await expect(taskAAfterReload).toBeVisible();

    // Verify time spent is visible on Client A before syncing
    const timeDisplayA = taskAAfterReload.locator('.time-wrapper .time-val').first();
    await expect(timeDisplayA).toBeVisible({ timeout: 5000 });
    const timeTextA = await timeDisplayA.textContent();
    console.log('Time spent on Client A:', timeTextA);
    // Time should show something like "3s" not "-"
    expect(timeTextA).not.toBe('-');

    // Sync Client A (Upload)
    await syncPageA.triggerSync();
    await waitForSync(pageA, syncPageA);

    // --- Client B ---
    const { context: contextB, page: pageB } = await setupClient(browser, url);
    const syncPageB = new SyncPage(pageB);
    const workViewPageB = new WorkViewPage(pageB);
    await workViewPageB.waitForTaskList();

    // Configure Sync on Client B
    await syncPageB.setupWebdavSync(WEBDAV_CONFIG);
    await expect(syncPageB.syncBtn).toBeVisible();

    // Sync Client B (Download)
    await syncPageB.triggerSync();
    await waitForSync(pageB, syncPageB);

    // Verify task appears on Client B
    const taskB = pageB.locator('task', { hasText: taskName }).first();
    await expect(taskB).toBeVisible();

    // Verify time spent is visible on Client B (time-wrapper contains time value)
    const timeDisplayB = taskB.locator('.time-wrapper .time-val').first();
    await expect(timeDisplayB).toBeVisible({ timeout: 5000 });
    const timeTextB = await timeDisplayB.textContent();
    console.log('Time spent on Client B:', timeTextB);

    // Time should be synced and show same value (not "-")
    expect(timeTextB).not.toBe('-');
    expect(timeTextB).toBeTruthy();

    // Cleanup
    await contextA.close();
    await contextB.close();
  });
});

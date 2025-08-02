import { test, expect } from '../../fixtures/test.fixture';
import { SyncPage } from '../../pages/sync.page';

test.describe('WebDAV Sync', () => {
  let syncPage: SyncPage;

  test.beforeEach(async ({ page, workViewPage }) => {
    syncPage = new SyncPage(page);
    await workViewPage.waitForTaskList();
  });

  test('should configure WebDAV sync', async ({ page, workViewPage }) => {
    // Configure WebDAV sync
    await syncPage.setupWebdavSync({
      baseUrl: 'http://localhost:2345/',
      username: 'admin',
      password: 'admin',
      syncFolderPath: '/super-productivity-test',
    });

    // Wait for sync dialog to close and sync button to be visible
    await expect(syncPage.syncBtn).toBeVisible({ timeout: 3000 });

    // Create a test task to ensure app is working
    await workViewPage.addTask('Test task for WebDAV sync');

    // Verify task was created
    await expect(page.locator('task')).toHaveCount(1);
  });

  test('should create and sync tasks', async ({ page, workViewPage }) => {
    // Configure WebDAV sync
    await syncPage.setupWebdavSync({
      baseUrl: 'http://localhost:2345/',
      username: 'admin',
      password: 'admin',
      syncFolderPath: '/super-productivity-test-2',
    });

    // Wait for sync dialog to close
    await expect(syncPage.syncBtn).toBeVisible({ timeout: 3000 });

    // Create multiple test tasks
    await workViewPage.addTask('First sync task');
    await workViewPage.addTask('Second sync task');

    // Verify tasks are present
    await expect(page.locator('task')).toHaveCount(2);

    // Trigger sync
    await syncPage.triggerSync();

    // Wait for sync to complete (wait for spinner to disappear or check icon to appear)
    await syncPage.waitForSyncComplete();

    // Verify sync button is still visible (basic check)
    await expect(syncPage.syncBtn).toBeVisible();
  });
});

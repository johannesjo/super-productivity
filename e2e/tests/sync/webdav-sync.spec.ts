import { test, expect } from '../../fixtures/test.fixture';
import { SyncPage } from '../../pages/sync.page';

// FIXME: These tests require a WebDAV server running on localhost:2345
// To run these tests, set up a WebDAV server with credentials admin/admin
// Example: docker run -p 2345:80 -e WEBDAV_USERNAME=admin -e WEBDAV_PASSWORD=admin bytemark/webdav
test.describe.skip('WebDAV Sync', () => {
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

    // Wait for dialog to close
    await page.waitForTimeout(1000);

    // The sync button should exist after configuration
    await expect(syncPage.syncBtn).toBeVisible();

    // Create a test task to ensure app is working
    await workViewPage.addTask('Test task for WebDAV sync');
    await page.waitForTimeout(500);

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

    await page.waitForTimeout(1000);

    // Create multiple test tasks
    await workViewPage.addTask('First sync task');
    await workViewPage.addTask('Second sync task');
    await page.waitForTimeout(500);

    // Verify tasks are present
    await expect(page.locator('task')).toHaveCount(2);

    // Trigger sync
    await syncPage.triggerSync();

    // Wait a reasonable time for sync
    await page.waitForTimeout(5000);

    // Verify sync button is still visible (basic check)
    await expect(syncPage.syncBtn).toBeVisible();
  });
});

import { test, expect } from '../../fixtures/test.fixture';
import { SyncPage } from '../../pages/sync.page';
import { WorkViewPage } from '../../pages/work-view.page';
import { waitForAppReady } from '../../utils/waits';
import { type Browser, type Page } from '@playwright/test';
import { isWebDavServerUp } from '../../utils/check-webdav';

test.describe('WebDAV Sync Advanced Features', () => {
  const WEBDAV_CONFIG_TEMPLATE = {
    baseUrl: 'http://127.0.0.1:2345/',
    username: 'admin',
    password: 'admin',
  };

  test.beforeAll(async () => {
    const isUp = await isWebDavServerUp(WEBDAV_CONFIG_TEMPLATE.baseUrl);
    if (!isUp) {
      console.warn('WebDAV server not reachable. Skipping WebDAV tests.');
      test.skip(true, 'WebDAV server not reachable');
    }
  });

  const createSyncFolder = async (request: any, folderName: string): Promise<void> => {
    const mkcolUrl = `${WEBDAV_CONFIG_TEMPLATE.baseUrl}${folderName}`;
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
  };

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

  test('should sync sub-tasks correctly', async ({ browser, baseURL, request }) => {
    const SYNC_FOLDER_NAME = `e2e-advanced-sub-${Date.now()}`;
    await createSyncFolder(request, SYNC_FOLDER_NAME);
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

    // Create Parent Task
    const parentTaskName = 'Parent Task';
    await workViewPageA.addTask(parentTaskName);
    const parentTaskA = pageA.locator('task', { hasText: parentTaskName }).first();

    // Create Sub Tasks
    await workViewPageA.addSubTask(parentTaskA, 'Sub Task 1');
    await workViewPageA.addSubTask(parentTaskA, 'Sub Task 2');

    // Verify structure on A
    await expect(pageA.locator('task-list[listid="SUB"] task')).toHaveCount(2);

    // Sync A
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

    // Sync B
    await syncPageB.triggerSync();
    await waitForSync(pageB, syncPageB);

    // Verify structure on B
    const parentTaskB = pageB.locator('task', { hasText: parentTaskName }).first();
    await expect(parentTaskB).toBeVisible();

    // Check for subtask count - expand first
    await parentTaskB.click(); // Ensure focus/expanded? Usually auto-expanded.

    // Use more specific locator for subtasks
    const subTaskList = pageB.locator(`task-list[listid="SUB"]`);
    await expect(subTaskList.locator('task')).toHaveCount(2);
    await expect(subTaskList.locator('task', { hasText: 'Sub Task 1' })).toBeVisible();
    await expect(subTaskList.locator('task', { hasText: 'Sub Task 2' })).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test('should sync task attachments', async ({ browser, baseURL, request }) => {
    test.slow();
    const SYNC_FOLDER_NAME = `e2e-advanced-att-${Date.now()}`;
    await createSyncFolder(request, SYNC_FOLDER_NAME);
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

    // Create Task
    const taskName = 'Attachment Task';
    await workViewPageA.addTask(taskName);
    const taskA = pageA.locator('task', { hasText: taskName }).first();

    // Add Attachment
    // Use context menu which is more reliable
    await taskA.click({ button: 'right' });

    // Click "Attach file or link" in context menu
    // The menu is in a portal, so we query the page
    const attachBtn = pageA.locator('.mat-mdc-menu-content button', {
      hasText: 'Attach',
    });
    await attachBtn.waitFor({ state: 'visible' });
    await attachBtn.click();

    // Dialog opens (direct attachment dialog or via side panel?)
    // The context menu action calls `addAttachment()`, which usually opens the dialog.
    const dialog = pageA.locator('dialog-edit-task-attachment');
    await expect(dialog).toBeVisible();

    // Fill title
    await dialog.locator('input[name="title"]').fill('Google');

    // Fill path/url
    const pathInput = dialog.locator('input[name="path"]');
    await pathInput.fill('https://google.com');

    await dialog.locator('button[type="submit"]').click();

    // Verify attachment indicator appears on task
    const attachmentBtn = taskA.locator('.attachment-btn');
    await expect(attachmentBtn).toBeVisible();

    // Click it to open side panel
    await attachmentBtn.click({ force: true });

    // Verify attachment added on A
    await expect(pageA.locator('.attachment-link')).toBeVisible();
    await expect(pageA.locator('.attachment-link')).toContainText('Google');

    // Sync A
    await syncPageA.triggerSync();
    await waitForSync(pageA, syncPageA);

    // --- Client B ---
    const { context: contextB, page: pageB } = await setupClient(browser, url);
    const syncPageB = new SyncPage(pageB);
    const workViewPageB = new WorkViewPage(pageB);
    await workViewPageB.waitForTaskList();

    // Configure Sync on Client B
    await syncPageB.setupWebdavSync(WEBDAV_CONFIG);

    // Sync B
    await syncPageB.triggerSync();
    await waitForSync(pageB, syncPageB);

    // Verify Attachment on B
    const taskB = pageB.locator('task', { hasText: taskName }).first();
    await expect(taskB).toBeVisible();

    // Click the attachment button to open the side panel with attachments expanded
    const attachmentBtnB = taskB.locator('.attachment-btn');
    await expect(attachmentBtnB).toBeVisible();
    await attachmentBtnB.click({ force: true });

    await expect(pageB.locator('.attachment-link')).toContainText('Google');

    await contextA.close();
    await contextB.close();
  });
});

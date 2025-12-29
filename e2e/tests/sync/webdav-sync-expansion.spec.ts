import { test, expect } from '../../fixtures/test.fixture';
import { SyncPage } from '../../pages/sync.page';
import { WorkViewPage } from '../../pages/work-view.page';
import { ProjectPage } from '../../pages/project.page';
import { waitForAppReady, waitForStatePersistence } from '../../utils/waits';
import { type Browser, type Page } from '@playwright/test';
import { isWebDavServerUp } from '../../utils/check-webdav';

test.describe('WebDAV Sync Expansion', () => {
  // Run sync tests serially to avoid WebDAV server contention
  test.describe.configure({ mode: 'serial' });

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

  const dismissTour = async (page: Page): Promise<void> => {
    try {
      const tourElement = page.locator('.shepherd-element').first();
      await tourElement.waitFor({ state: 'visible', timeout: 4000 });
      const cancelIcon = page.locator('.shepherd-cancel-icon').first();
      if (await cancelIcon.isVisible()) {
        await cancelIcon.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await tourElement.waitFor({ state: 'hidden', timeout: 3000 });
    } catch (e) {
      // Ignore
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
    await dismissTour(page);
    return { context, page };
  };

  const waitForSync = async (
    page: Page,
    syncPage: SyncPage,
  ): Promise<'success' | 'conflict' | void> => {
    const startTime = Date.now();
    await expect(syncPage.syncBtn).toBeVisible({ timeout: 10000 });

    while (Date.now() - startTime < 60000) {
      const successVisible = await syncPage.syncCheckIcon.isVisible();
      if (successVisible) return 'success';

      const conflictDialog = page.locator('dialog-sync-conflict');
      if (await conflictDialog.isVisible()) return 'conflict';

      const snackBars = page.locator('.mat-mdc-snack-bar-container');
      const count = await snackBars.count();
      for (let i = 0; i < count; ++i) {
        const text = await snackBars.nth(i).innerText();
        if (text.toLowerCase().includes('error') || text.toLowerCase().includes('fail')) {
          throw new Error(`Sync failed with error: ${text}`);
        }
      }
      await page.waitForTimeout(500);
    }
    throw new Error('Sync timeout: Success icon did not appear');
  };

  test('should sync projects', async ({ browser, baseURL, request }) => {
    test.slow();
    const SYNC_FOLDER_NAME = `e2e-expansion-proj-${Date.now()}`;
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
    const projectPageA = new ProjectPage(pageA);
    await workViewPageA.waitForTaskList();

    // Configure Sync A
    await syncPageA.setupWebdavSync(WEBDAV_CONFIG);

    // Create Project on A
    const projectName = 'Synced Project';
    await projectPageA.createProject(projectName);

    // Navigate to the newly created project (createProject doesn't auto-navigate)
    await projectPageA.navigateToProjectByName(projectName);

    // Add task to new project on A
    await workViewPageA.addTask('Task in Project A');

    // Sync A
    await syncPageA.triggerSync();
    await waitForSync(pageA, syncPageA);

    // --- Client B ---
    const { context: contextB, page: pageB } = await setupClient(browser, url);
    const syncPageB = new SyncPage(pageB);
    const workViewPageB = new WorkViewPage(pageB);
    const projectPageB = new ProjectPage(pageB);
    await workViewPageB.waitForTaskList();

    // Configure Sync B
    await syncPageB.setupWebdavSync(WEBDAV_CONFIG);
    await syncPageB.triggerSync();
    await waitForSync(pageB, syncPageB);

    // Reload to ensure UI is updated with synced data
    await pageB.reload();
    await waitForAppReady(pageB);
    await dismissTour(pageB);

    // Wait for the synced project to appear in the sidebar
    // First ensure Projects group is expanded
    const projectsTree = pageB.locator('nav-list-tree').filter({ hasText: 'Projects' });
    const projectsGroupBtn = projectsTree
      .locator('.g-multi-btn-wrapper nav-item button')
      .first();
    await projectsGroupBtn.waitFor({ state: 'visible', timeout: 5000 });
    const isExpanded = await projectsGroupBtn.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
      await projectsGroupBtn.click();
    }

    // Now wait for the project to appear
    const projectBtn = projectsTree.locator('button').filter({ hasText: projectName });
    await projectBtn.waitFor({ state: 'visible', timeout: 15000 });

    await projectPageB.navigateToProjectByName(projectName);

    // Verify task
    await expect(pageB.locator('task')).toHaveCount(1);
    await expect(pageB.locator('task').first()).toContainText('Task in Project A');

    // Add task on B in project
    await workViewPageB.addTask('Task in Project B');
    await syncPageB.triggerSync();
    await waitForSync(pageB, syncPageB);

    // Sync A
    await syncPageA.triggerSync();
    await waitForSync(pageA, syncPageA);

    await pageA.reload();
    await waitForAppReady(pageA);

    // Ensure we are on the project page
    await projectPageA.navigateToProjectByName(projectName);

    // Verify task on A
    await expect(pageA.locator('task', { hasText: 'Task in Project B' })).toBeVisible({
      timeout: 20000,
    });

    await contextA.close();
    await contextB.close();
  });

  test('should sync task done state', async ({ browser, baseURL, request }) => {
    test.slow();
    const SYNC_FOLDER_NAME = `e2e-expansion-done-${Date.now()}`;
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

    await syncPageA.setupWebdavSync(WEBDAV_CONFIG);

    const taskName = 'Task to be done';
    await workViewPageA.addTask(taskName);

    await syncPageA.triggerSync();
    await waitForSync(pageA, syncPageA);

    // --- Client B ---
    const { context: contextB, page: pageB } = await setupClient(browser, url);
    const syncPageB = new SyncPage(pageB);
    const workViewPageB = new WorkViewPage(pageB);
    await workViewPageB.waitForTaskList();

    // Configure Sync B
    await syncPageB.setupWebdavSync(WEBDAV_CONFIG);
    await syncPageB.triggerSync();
    await waitForSync(pageB, syncPageB);

    await pageB.reload();
    await waitForAppReady(pageB);
    await dismissTour(pageB);
    await workViewPageB.waitForTaskList();

    await expect(pageB.locator('task', { hasText: taskName })).toBeVisible({
      timeout: 20000,
    });

    // Mark done on A
    const taskA = pageA.locator('task', { hasText: taskName }).first();
    await taskA.waitFor({ state: 'visible' });
    await taskA.hover();
    const doneBtnA = taskA.locator('.task-done-btn');
    await doneBtnA.click({ force: true });

    // Wait for done state (strikethrough or disappearance depending on config, default is just strikethrough/checked)
    // By default, done tasks might move to "Done" list or stay.
    // Assuming default behavior: check if class 'is-done' is present or checkbox checked.
    await expect(taskA).toHaveClass(/isDone/);

    await syncPageA.triggerSync();
    await waitForSync(pageA, syncPageA);

    // Sync B
    await syncPageB.triggerSync();
    await waitForSync(pageB, syncPageB);

    const taskB = pageB.locator('task', { hasText: taskName }).first();
    await expect(taskB).toHaveClass(/isDone/);

    // Mark undone on B
    const doneBtnB = taskB.locator('.check-done');
    await doneBtnB.click();
    await expect(taskB).not.toHaveClass(/isDone/);

    // Wait for state persistence before syncing
    await waitForStatePersistence(pageB);

    await syncPageB.triggerSync();
    await waitForSync(pageB, syncPageB);

    // Sync A
    await syncPageA.triggerSync();
    await waitForSync(pageA, syncPageA);

    // Reload A to ensure UI reflects synced state
    await pageA.reload();
    await waitForAppReady(pageA);
    await dismissTour(pageA);
    await workViewPageA.waitForTaskList();

    // Wait for synced data to propagate to UI
    await pageA.waitForTimeout(1000);

    // Re-locate the task after reload - it should now be in the active task list (not done)
    const taskAAfterSync = pageA.locator('task', { hasText: taskName }).first();
    await expect(taskAAfterSync).not.toHaveClass(/isDone/, { timeout: 10000 });

    await contextA.close();
    await contextB.close();
  });
});

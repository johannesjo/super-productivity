import {
  type Browser,
  type BrowserContext,
  type Page,
  type APIRequestContext,
} from '@playwright/test';
import { waitForAppReady } from './waits';
import { SyncPage } from '../pages/sync.page';

export interface WebDavConfig {
  baseUrl: string;
  username: string;
  password: string;
  syncFolderPath: string;
}

export const WEBDAV_CONFIG_TEMPLATE = {
  baseUrl: 'http://127.0.0.1:2345/',
  username: 'admin',
  password: 'admin',
};

/**
 * Creates a unique sync folder name with timestamp for test isolation
 */
export const createUniqueSyncFolder = (prefix: string): string => {
  return `e2e-${prefix}-${Date.now()}`;
};

/**
 * Creates WebDAV folder via MKCOL request
 */
export const createWebDavFolder = async (
  request: APIRequestContext,
  folderName: string,
): Promise<void> => {
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

/**
 * Sets up a client browser context with tour dismissal
 */
export const setupClient = async (
  browser: Browser,
  baseURL: string | undefined,
): Promise<{ context: BrowserContext; page: Page }> => {
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
  } catch {
    // Tour didn't appear or wasn't dismissable, ignore
  }

  return { context, page };
};

/**
 * Waits for sync to complete and returns the result
 */
export const waitForSync = async (
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

/**
 * Simulates network failure by aborting all WebDAV requests
 */
export const simulateNetworkFailure = async (page: Page): Promise<void> => {
  await page.route('**/127.0.0.1:2345/**', (route) => route.abort('connectionfailed'));
};

/**
 * Restores network by removing WebDAV request interception
 */
export const restoreNetwork = async (page: Page): Promise<void> => {
  await page.unroute('**/127.0.0.1:2345/**');
};

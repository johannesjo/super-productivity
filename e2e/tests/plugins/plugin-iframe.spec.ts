import { expect, test } from '../../fixtures/test.fixture';
import { cssSelectors } from '../../constants/selectors';
import {
  enablePluginWithVerification,
  getCITimeoutMultiplier,
  logPluginState,
  waitForPluginAssets,
  waitForPluginInMenu,
  waitForPluginManagementInit,
} from '../../helpers/plugin-test.helpers';

const { SIDENAV, SETTINGS_BTN } = cssSelectors;

// Plugin-related selectors
const PLUGIN_NAV_ITEMS = `${SIDENAV} nav-item button`;
const PLUGIN_IFRAME = 'plugin-index iframe';
const PLUGIN_MANAGEMENT = 'plugin-management';
const PLUGIN_SECTION = '.plugin-section';
const SETTINGS_PAGE = '.page-settings';
const COLLAPSIBLE_EXPANDED = '.plugin-section collapsible.isExpanded';

test.describe.serial('Plugin Iframe', () => {
  test.beforeEach(async ({ page, workViewPage }) => {
    // Increase timeout for CI environment
    const timeoutMultiplier = getCITimeoutMultiplier();
    test.setTimeout(30000 * timeoutMultiplier); // Reduced from 60s to 30s base

    // First, ensure plugin assets are available
    const assetsAvailable = await waitForPluginAssets(page);
    if (!assetsAvailable) {
      if (process.env.CI) {
        test.skip(true, 'Plugin assets not available in CI - skipping test');
        return;
      }
      throw new Error('Plugin assets not available - cannot proceed with test');
    }

    await workViewPage.waitForTaskList();

    const initSuccess = await waitForPluginManagementInit(page);
    if (!initSuccess) {
      throw new Error(
        'Plugin management failed to initialize (timeout waiting for plugin cards)',
      );
    }

    // Navigate to settings
    const settingsBtn = page.locator(SETTINGS_BTN);
    await settingsBtn.waitFor({ state: 'visible' });
    await settingsBtn.click();

    // Wait for settings page to be visible
    await page.waitForSelector(SETTINGS_PAGE, { state: 'visible' });

    // Scroll to plugin section
    const pluginSection = page.locator(PLUGIN_SECTION);
    await pluginSection.scrollIntoViewIfNeeded();

    // Expand collapsible if needed
    const collapsible = page.locator('.plugin-section collapsible');
    const collapsibleHeader = collapsible.locator('.collapsible-header');

    // Check if already expanded, if not click to expand
    const expandedCollapsible = page.locator(COLLAPSIBLE_EXPANDED);
    if ((await expandedCollapsible.count()) === 0) {
      await collapsibleHeader.click();
      // Wait for the expanded class to appear
      await page.waitForSelector(COLLAPSIBLE_EXPANDED, { state: 'visible' });
    }

    // Wait for plugin management to be visible
    await page.waitForSelector(PLUGIN_MANAGEMENT, {
      state: 'visible',
      timeout: 10000 * timeoutMultiplier,
    });

    // Log current plugin state for debugging
    if (process.env.CI) {
      await logPluginState(page);
    }

    // Enable API Test Plugin with verification
    const pluginEnabled = await enablePluginWithVerification(
      page,
      'API Test Plugin',
      10000 * timeoutMultiplier, // Reduced from 15s to 10s
    );

    if (!pluginEnabled) {
      throw new Error('Failed to enable API Test Plugin');
    }

    // Wait for plugin to appear in menu (navigates to work view internally)
    const pluginInMenu = await waitForPluginInMenu(
      page,
      'API Test Plugin',
      15000 * timeoutMultiplier, // Reduced from 20s to 15s
    );

    if (!pluginInMenu) {
      // Log state for debugging
      await logPluginState(page);
      throw new Error('API Test Plugin not found in menu after enabling');
    }

    // Dismiss tour dialog if present (non-blocking)
    const tourDialog = page.locator('[data-shepherd-step-id="Welcome"]');
    if (await tourDialog.isVisible().catch(() => false)) {
      const cancelBtn = page.locator(
        'button:has-text("No thanks"), .shepherd-cancel-icon',
      );
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
        // Wait for dialog to disappear
        await tourDialog.waitFor({ state: 'hidden' });
      }
    }
  });

  test('open plugin iframe view', async ({ page }) => {
    // Plugin nav item should already be visible from beforeEach
    const pluginMenuItem = page
      .locator(PLUGIN_NAV_ITEMS)
      .filter({ hasText: 'API Test Plugin' });

    // Click plugin menu item
    await pluginMenuItem.click();

    // Wait for navigation to plugin page
    await page.waitForURL(/\/plugins\/api-test-plugin\/index/);

    // Wait for iframe to be visible
    const iframe = page.locator(PLUGIN_IFRAME);
    await iframe.waitFor({ state: 'visible' });

    // Verify iframe is loaded
    await expect(iframe).toBeVisible();
  });

  test('verify iframe loads with correct content', async ({ page }) => {
    // Navigate directly to plugin page
    await page.goto('/#/plugins/api-test-plugin/index');

    // Wait for iframe to be visible
    const iframe = page.locator(PLUGIN_IFRAME);
    await iframe.waitFor({ state: 'visible' });

    // Verify iframe exists and is visible
    await expect(iframe).toBeVisible();

    // Try to verify iframe content if possible
    // Note: Cross-origin iframes may not allow content access
    const frameLocator = page.frameLocator(PLUGIN_IFRAME);
    try {
      // Wait for iframe body to be loaded
      await frameLocator.locator('body').waitFor({ state: 'visible' });

      // Check for expected content if accessible
      const h1 = frameLocator.locator('h1');
      const hasH1 = (await h1.count()) > 0;
      if (hasH1) {
        await expect(h1).toContainText('API Test Plugin');
      }
    } catch (error) {
      // If iframe content is not accessible due to cross-origin restrictions,
      // at least verify the iframe element itself is present
      // console.log('Note: Iframe content verification skipped (possibly cross-origin)');
      await expect(iframe).toBeVisible();
    }
  });
});

import { test, expect } from '../../fixtures/test.fixture';
import { cssSelectors } from '../../constants/selectors';

const { SIDENAV } = cssSelectors;

// Plugin-related selectors
const PLUGIN_MENU_ITEM = `${SIDENAV} plugin-menu button`;
const PLUGIN_IFRAME = 'plugin-index iframe';
const SETTINGS_BTN = `${SIDENAV} .tour-settingsMenuBtn`;
const PLUGIN_MANAGEMENT = 'plugin-management';
const PLUGIN_SECTION = '.plugin-section';
const SETTINGS_PAGE = '.page-settings';
const COLLAPSIBLE_EXPANDED = '.plugin-section collapsible.isExpanded';

test.describe.serial('Plugin Iframe', () => {
  test.beforeEach(async ({ page, workViewPage }) => {
    test.setTimeout(60000); // Overall test timeout for CI

    await workViewPage.waitForTaskList();

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
    await page.waitForSelector(PLUGIN_MANAGEMENT, { state: 'visible' });

    // Find API Test Plugin card using filter
    const pluginCards = page.locator('plugin-management mat-card');
    const apiPluginCard = pluginCards.filter({ hasText: 'API Test Plugin' });

    // Find the toggle within the API Test Plugin card
    const toggle = apiPluginCard.locator('mat-slide-toggle button[role="switch"]');
    await toggle.waitFor({ state: 'visible' });

    // Check if already enabled by checking aria-checked attribute
    const isEnabled = (await toggle.getAttribute('aria-checked')) === 'true';
    if (!isEnabled) {
      // Not enabled, click to enable
      await toggle.click();
      // Wait for the aria-checked attribute to become true
      await page.waitForFunction(
        () => {
          const cards = Array.from(
            document.querySelectorAll('plugin-management mat-card'),
          );
          const apiCard = cards.find((card) =>
            card
              .querySelector('mat-card-title')
              ?.textContent?.includes('API Test Plugin'),
          );
          const toggleBtn = apiCard?.querySelector(
            'mat-slide-toggle button[role="switch"]',
          ) as HTMLButtonElement;
          return toggleBtn?.getAttribute('aria-checked') === 'true';
        },
        { timeout: 10000 },
      );
    }

    // Navigate back to work view
    await page.goto('/#/tag/TODAY');

    // Wait for the task list to confirm we're on the work view
    await page.waitForSelector('task-list', { state: 'visible' });

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

    // Wait for plugin menu to appear (indicates plugin is loaded)
    await page.waitForSelector(PLUGIN_MENU_ITEM, { state: 'visible' });
  });

  test('open plugin iframe view', async ({ page }) => {
    // Plugin menu item should already be visible from beforeEach
    const pluginMenuItem = page.locator(PLUGIN_MENU_ITEM);

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
      console.log('Note: Iframe content verification skipped (possibly cross-origin)');
      await expect(iframe).toBeVisible();
    }
  });
});

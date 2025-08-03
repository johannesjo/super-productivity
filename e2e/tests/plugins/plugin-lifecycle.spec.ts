import { test, expect } from '../../fixtures/test.fixture';
import { cssSelectors } from '../../constants/selectors';
import {
  waitForPluginAssets,
  waitForPluginSystemInit,
  getCITimeoutMultiplier,
} from '../../helpers/plugin-test.helpers';

const { SIDENAV } = cssSelectors;

// Plugin-related selectors
const SETTINGS_BTN = `${SIDENAV} .tour-settingsMenuBtn`;
const PLUGIN_MENU = `${SIDENAV} plugin-menu`;
const PLUGIN_MENU_ITEM = `${PLUGIN_MENU} button`;

test.describe.serial('Plugin Lifecycle', () => {
  test.beforeEach(async ({ page, workViewPage }) => {
    const timeoutMultiplier = getCITimeoutMultiplier();
    test.setTimeout(60000 * timeoutMultiplier);

    console.log('[Plugin Test] Starting plugin lifecycle test setup...');

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

    // Wait for plugin system to initialize
    const pluginSystemReady = await waitForPluginSystemInit(page);
    if (!pluginSystemReady) {
      console.warn('[Plugin Test] Plugin system may not be fully initialized');
    }

    // Enable API Test Plugin
    const settingsBtn = page.locator(SETTINGS_BTN);
    await settingsBtn.waitFor({ state: 'visible' });
    await settingsBtn.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const configPage = document.querySelector('.page-settings');
      if (!configPage) {
        console.error('Not on config page');
        return;
      }

      const pluginSection = document.querySelector('.plugin-section');
      if (pluginSection) {
        pluginSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      const collapsible = document.querySelector('.plugin-section collapsible');
      if (collapsible) {
        const isExpanded = collapsible.classList.contains('isExpanded');
        if (!isExpanded) {
          const header = collapsible.querySelector('.collapsible-header');
          if (header) {
            (header as HTMLElement).click();
          }
        }
      }
    });

    await page.waitForTimeout(100);
    await expect(page.locator('plugin-management')).toBeVisible({ timeout: 5000 });

    // Enable the plugin
    const enableResult = await page.evaluate((pluginName: string) => {
      const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
      const targetCard = cards.find((card) => {
        const title = card.querySelector('mat-card-title')?.textContent || '';
        return title.includes(pluginName);
      });

      if (targetCard) {
        const toggleButton = targetCard.querySelector(
          'mat-slide-toggle button[role="switch"]',
        ) as HTMLButtonElement;
        if (toggleButton) {
          const wasChecked = toggleButton.getAttribute('aria-checked') === 'true';
          if (!wasChecked) {
            toggleButton.click();
          }
          return {
            found: true,
            wasEnabled: wasChecked,
            clicked: !wasChecked,
          };
        }
        return { found: true, hasToggle: false };
      }

      return { found: false };
    }, 'API Test Plugin');

    console.log(`Plugin "API Test Plugin" enable state:`, enableResult);
    expect(enableResult.found).toBe(true);

    // Wait for plugin to initialize (3 seconds like successful tests)
    await page.waitForTimeout(100);

    // Go back to work view
    await page.goto('/#/tag/TODAY');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(100);

    // Wait for task list to be visible
    await page.waitForSelector('task-list', { state: 'visible', timeout: 10000 });
  });

  test('verify plugin is initially loaded', async ({ page }) => {
    test.setTimeout(20000); // Increase timeout
    await page.waitForTimeout(100); // Wait for plugins to initialize

    // Plugin doesn't show snack bar on load, check plugin menu instead
    await expect(page.locator(PLUGIN_MENU_ITEM)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(PLUGIN_MENU_ITEM)).toContainText('API Test Plugin');
  });

  test('test plugin navigation', async ({ page }) => {
    test.setTimeout(20000); // Increase timeout

    // Click on the plugin menu item to navigate to plugin
    await expect(page.locator(PLUGIN_MENU_ITEM)).toBeVisible();
    await page.click(PLUGIN_MENU_ITEM);
    await page.waitForTimeout(100);

    // Verify we navigated to the plugin page
    await expect(page).toHaveURL(/\/plugins\/api-test-plugin\/index/);
    await expect(page.locator('iframe')).toBeVisible();

    // Go back to work view
    await page.goto('/#/tag/TODAY');
  });

  test('disable plugin and verify cleanup', async ({ page, workViewPage }) => {
    test.setTimeout(30000); // Increase timeout

    // First enable the plugin
    await page.click(SETTINGS_BTN);
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const pluginSection = document.querySelector('.plugin-section');
      if (pluginSection) {
        pluginSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      const collapsible = document.querySelector('.plugin-section collapsible');
      if (collapsible && !collapsible.classList.contains('isExpanded')) {
        const header = collapsible.querySelector('.collapsible-header');
        if (header) {
          (header as HTMLElement).click();
        }
      }
    });

    await page.waitForTimeout(100);

    // Enable the plugin first
    await page.evaluate((pluginName: string) => {
      const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
      const targetCard = cards.find((card) => {
        const title = card.querySelector('mat-card-title')?.textContent || '';
        return title.includes(pluginName);
      });

      if (targetCard) {
        const toggleButton = targetCard.querySelector(
          'mat-slide-toggle button[role="switch"]',
        ) as HTMLButtonElement;
        if (toggleButton && toggleButton.getAttribute('aria-checked') !== 'true') {
          toggleButton.click();
        }
      }
    }, 'API Test Plugin');

    await page.waitForTimeout(100); // Wait for plugin to enable

    // Find and disable the API Test Plugin
    await page.evaluate((pluginName: string) => {
      const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
      const targetCard = cards.find((card) => {
        const title = card.querySelector('mat-card-title')?.textContent || '';
        return title.includes(pluginName);
      });

      if (targetCard) {
        const toggleButton = targetCard.querySelector(
          'mat-slide-toggle button[role="switch"]',
        ) as HTMLButtonElement;
        if (toggleButton && toggleButton.getAttribute('aria-checked') === 'true') {
          toggleButton.click();
        }
      }
    }, 'API Test Plugin');

    await page.waitForTimeout(100); // Wait for plugin to disable

    // Go back and verify menu entry is removed
    await page.goto('/#/tag/TODAY');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(100);

    // Reload to ensure plugin state is refreshed
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(100);

    await expect(page.locator(PLUGIN_MENU_ITEM)).not.toBeVisible();
  });
});

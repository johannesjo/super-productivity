import { test, expect } from '../../fixtures/test.fixture';
import { cssSelectors } from '../../constants/selectors';
import {
  waitForPluginAssets,
  waitForPluginManagementInit,
  getCITimeoutMultiplier,
} from '../../helpers/plugin-test.helpers';

const { SIDENAV } = cssSelectors;

// Plugin-related selectors
const SETTINGS_BTN = `${SIDENAV} .tour-settingsMenuBtn`;
const PLUGIN_MENU = `${SIDENAV} plugin-menu`;
const PLUGIN_MENU_ITEM = `${PLUGIN_MENU} button`;

test.describe('Plugin Lifecycle', () => {
  test.beforeEach(async ({ page, workViewPage }) => {
    const timeoutMultiplier = getCITimeoutMultiplier();
    test.setTimeout(60000 * timeoutMultiplier);

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

    await waitForPluginManagementInit(page);

    // Enable API Test Plugin
    const settingsBtn = page.locator(SETTINGS_BTN);
    await settingsBtn.waitFor({ state: 'visible' });
    await settingsBtn.click();
    // Wait for navigation to settings page
    await page.waitForTimeout(500); // Give time for navigation
    // Wait for settings page to be fully visible - use first() to avoid multiple matches
    await page.locator('.page-settings').first().waitFor({ state: 'visible' });
    await page.waitForTimeout(50); // Small delay for UI settling

    await page.evaluate(() => {
      const configPage = document.querySelector('.page-settings');
      if (!configPage) {
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

    // Wait for plugin management section to be visible
    await page.locator('plugin-management').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(50); // Small delay for UI settling

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

    expect(enableResult.found).toBe(true);

    // Wait for plugin to initialize
    await page.waitForTimeout(100); // Small delay for plugin initialization

    // Go back to work view
    await page.goto('/#/tag/TODAY');
    // Wait for navigation and work view to be ready
    await page.waitForTimeout(500); // Give time for navigation
    await page.locator('.route-wrapper').waitFor({ state: 'visible' });
    await page.waitForTimeout(50); // Small delay for UI settling

    // Wait for task list to be visible
    await page.waitForSelector('task-list', { state: 'visible', timeout: 10000 });
  });

  test('verify plugin is initially loaded', async ({ page }) => {
    test.setTimeout(20000); // Increase timeout
    // Wait for plugin menu to be ready
    await page.locator(PLUGIN_MENU).waitFor({ state: 'visible' });
    await page.waitForTimeout(50); // Small delay for plugins to initialize

    // Plugin doesn't show snack bar on load, check plugin menu instead
    await expect(page.locator(PLUGIN_MENU_ITEM)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(PLUGIN_MENU_ITEM)).toContainText('API Test Plugin');
  });

  test('test plugin navigation', async ({ page }) => {
    test.setTimeout(20000); // Increase timeout

    // Click on the plugin menu item to navigate to plugin
    await expect(page.locator(PLUGIN_MENU_ITEM)).toBeVisible();
    await page.click(PLUGIN_MENU_ITEM);
    // Wait for navigation to plugin page
    await page.waitForTimeout(500); // Give time for navigation
    await page.waitForTimeout(50); // Small delay for UI settling

    // Verify we navigated to the plugin page
    await expect(page).toHaveURL(/\/plugins\/api-test-plugin\/index/);
    await expect(page.locator('iframe')).toBeVisible();

    // Go back to work view
    await page.goto('/#/tag/TODAY');
  });

  test('disable plugin and verify cleanup', async ({ page, workViewPage }) => {
    test.setTimeout(30000); // Increase timeout

    // Navigate to settings
    await page.click(SETTINGS_BTN);
    // Wait for navigation to settings page
    await page.waitForTimeout(500); // Give time for navigation
    // Wait for settings page to be visible - use first() to avoid multiple matches
    await page.locator('.page-settings').first().waitFor({ state: 'visible' });
    await page.waitForTimeout(200); // Small delay for UI settling

    // Expand plugin section
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

    // Wait for plugin management to be ready
    await page.locator('plugin-management').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500); // Give time for plugins to load

    // Check current state of the plugin and enable if needed
    const currentState = await page.evaluate((pluginName: string) => {
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
          const isEnabled = toggleButton.getAttribute('aria-checked') === 'true';
          if (!isEnabled) {
            toggleButton.click();
            return { found: true, wasEnabled: false, clicked: true };
          }
          return { found: true, wasEnabled: true, clicked: false };
        }
      }
      return { found: false };
    }, 'API Test Plugin');

    // If we just enabled it, wait for it to be enabled
    if (currentState.clicked) {
      await page.waitForFunction(
        (name) => {
          const cards = Array.from(
            document.querySelectorAll('plugin-management mat-card'),
          );
          const targetCard = cards.find((card) => {
            const title = card.querySelector('mat-card-title')?.textContent || '';
            return title.includes(name);
          });
          const toggle = targetCard?.querySelector(
            'mat-slide-toggle button[role="switch"]',
          ) as HTMLButtonElement;
          return toggle?.getAttribute('aria-checked') === 'true';
        },
        'API Test Plugin',
        { timeout: 5000 },
      );
      await page.waitForTimeout(1000); // Wait for plugin to fully initialize
    }

    // Now disable the plugin
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
          return { found: true, clicked: true };
        }
        return { found: true, clicked: false, alreadyDisabled: true };
      }
      return { found: false };
    }, 'API Test Plugin');

    // Wait for toggle state to update to disabled
    await page.waitForFunction(
      (name) => {
        const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
        const targetCard = cards.find((card) => {
          const title = card.querySelector('mat-card-title')?.textContent || '';
          return title.includes(name);
        });
        const toggle = targetCard?.querySelector(
          'mat-slide-toggle button[role="switch"]',
        ) as HTMLButtonElement;
        return toggle?.getAttribute('aria-checked') === 'false';
      },
      'API Test Plugin',
      { timeout: 5000 },
    );
    await page.waitForTimeout(1000); // Wait for plugin to fully disable

    // Go back to work view
    await page.goto('/#/tag/TODAY');
    // Wait for navigation and work view to be ready
    await page.waitForTimeout(500); // Give time for navigation
    await page.locator('.route-wrapper').waitFor({ state: 'visible' });
    await page.waitForTimeout(500); // Small delay for UI settling

    // Check if the plugin menu exists and verify the API Test Plugin is not in it
    const pluginMenuExists = (await page.locator(PLUGIN_MENU).count()) > 0;

    if (pluginMenuExists) {
      // Check all plugin menu items to ensure API Test Plugin is not present
      const hasApiTestPlugin = await page.evaluate(() => {
        const menuItems = Array.from(document.querySelectorAll('plugin-menu button'));
        return menuItems.some((item) => item.textContent?.includes('API Test Plugin'));
      });

      expect(hasApiTestPlugin).toBe(false);
    } else {
      // Plugin menu doesn't exist at all, which is also valid when no plugins are enabled
      expect(pluginMenuExists).toBe(false);
    }
  });
});

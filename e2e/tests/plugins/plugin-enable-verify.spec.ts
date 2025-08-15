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

const { SIDENAV } = cssSelectors;
const SETTINGS_BTN = `${SIDENAV} .tour-settingsMenuBtn`;

test.describe.serial('Plugin Enable Verify', () => {
  test('enable API Test Plugin and verify menu entry', async ({ page, workViewPage }) => {
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

    // Navigate to plugin settings
    await page.click(SETTINGS_BTN);
    await page.waitForSelector('.page-settings', {
      state: 'visible',
      timeout: 10000 * timeoutMultiplier,
    });

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

    // Wait for plugin management to be visible
    await page.waitForSelector('plugin-management', {
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
      15000 * timeoutMultiplier,
    );

    expect(pluginEnabled).toBe(true);

    // Wait for plugin to appear in menu
    const pluginInMenu = await waitForPluginInMenu(
      page,
      'API Test Plugin',
      20000 * timeoutMultiplier,
    );

    expect(pluginInMenu).toBe(true);

    // Additional verification - check menu structure
    const menuResult = await page.evaluate(() => {
      const pluginMenu = document.querySelector('side-nav plugin-menu');
      const buttons = pluginMenu ? Array.from(pluginMenu.querySelectorAll('button')) : [];

      return {
        hasPluginMenu: !!pluginMenu,
        buttonCount: buttons.length,
        buttonTexts: buttons.map((btn) => btn.textContent?.trim() || ''),
      };
    });

    expect(menuResult.hasPluginMenu).toBe(true);
    expect(menuResult.buttonCount).toBeGreaterThan(0);
    // Check if any button text contains "API Test Plugin" (handle whitespace)
    const hasApiTestPlugin = menuResult.buttonTexts.some((text: string) =>
      text.includes('API Test Plugin'),
    );
    expect(hasApiTestPlugin).toBe(true);
  });
});

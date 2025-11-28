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

const { SETTINGS_BTN } = cssSelectors;

test.describe.serial('Plugin Enable Verify', () => {
  test('enable API Test Plugin and verify menu entry', async ({ page, workViewPage }) => {
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
      10000 * timeoutMultiplier, // Reduced from 15s to 10s
    );

    expect(pluginEnabled).toBe(true);

    // Wait for plugin to appear in menu
    const pluginInMenu = await waitForPluginInMenu(
      page,
      'API Test Plugin',
      15000 * timeoutMultiplier, // Reduced from 20s to 15s
    );

    expect(pluginInMenu).toBe(true);

    // Additional verification - check menu structure in magic-side-nav
    const menuResult = await page.evaluate(() => {
      // Look for plugin items in magic-side-nav structure
      const sideNav = document.querySelector('magic-side-nav');
      const navButtons = sideNav
        ? Array.from(sideNav.querySelectorAll('nav-item button'))
        : [];

      return {
        hasSideNav: !!sideNav,
        buttonCount: navButtons.length,
        buttonTexts: navButtons.map((btn) => btn.textContent?.trim() || ''),
      };
    });

    expect(menuResult.hasSideNav).toBe(true);
    expect(menuResult.buttonCount).toBeGreaterThan(0);
    // Check if any button text contains "API Test Plugin" (handle whitespace)
    const hasApiTestPlugin = menuResult.buttonTexts.some((text: string) =>
      text.includes('API Test Plugin'),
    );
    expect(hasApiTestPlugin).toBe(true);
  });
});

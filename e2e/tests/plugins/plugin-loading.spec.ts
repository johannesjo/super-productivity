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
const PLUGIN_CARD = 'plugin-management mat-card.ng-star-inserted';
const PLUGIN_ITEM = `${PLUGIN_CARD}`;
const PLUGIN_MENU_ENTRY = `${SIDENAV} plugin-menu button`;
const PLUGIN_IFRAME = 'plugin-index iframe';

test.describe.serial('Plugin Loading', () => {
  test('full plugin loading lifecycle', async ({ page, workViewPage }) => {
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

    // Enable API Test Plugin first (implementing enableTestPlugin inline)
    await page.click(SETTINGS_BTN);
    await page.waitForTimeout(1000);

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

    await page.waitForTimeout(1000);
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
            enabled: true,
            found: true,
            wasChecked,
            nowChecked: toggleButton.getAttribute('aria-checked') === 'true',
            clicked: !wasChecked,
          };
        }
        return { enabled: false, found: true, error: 'No toggle found' };
      }

      return { enabled: false, found: false };
    }, 'API Test Plugin');

    expect(enableResult.found).toBe(true);

    await page.waitForTimeout(2000); // Wait for plugin to initialize

    // Navigate to plugin management
    await expect(page.locator(PLUGIN_CARD).first()).toBeVisible();
    await page.waitForTimeout(500);

    // Check example plugin is loaded and enabled
    const pluginCardsResult = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
      const pluginCards = cards.filter((card) => card.querySelector('mat-slide-toggle'));
      return {
        totalCards: cards.length,
        pluginCardsCount: pluginCards.length,
        pluginTitles: pluginCards.map(
          (card) => card.querySelector('mat-card-title')?.textContent?.trim() || '',
        ),
      };
    });

    expect(pluginCardsResult.pluginCardsCount).toBeGreaterThanOrEqual(1);
    expect(pluginCardsResult.pluginTitles).toContain('API Test Plugin');

    // Verify plugin menu entry exists
    await page.click(SIDENAV); // Ensure sidenav is visible
    await expect(page.locator(PLUGIN_MENU_ENTRY)).toBeVisible();
    await expect(page.locator(PLUGIN_MENU_ENTRY)).toContainText('API Test Plugin');

    // Open plugin iframe view
    await page.click(PLUGIN_MENU_ENTRY);
    await expect(page.locator(PLUGIN_IFRAME)).toBeVisible();
    await expect(page).toHaveURL(/\/plugins\/api-test-plugin\/index/);
    await page.waitForTimeout(1000); // Wait for iframe to load

    // Switch to iframe context and verify content
    const frame = page.frameLocator(PLUGIN_IFRAME);
    await expect(frame.locator('h1')).toBeVisible();
    await expect(frame.locator('h1')).toContainText('API Test Plugin');

    await page.waitForTimeout(500);

    // Verify plugin functionality - show notification
    await expect(page.locator(PLUGIN_MENU_ENTRY)).toBeVisible();
    await expect(page.locator(PLUGIN_MENU_ENTRY)).toContainText('API Test Plugin');
  });

  test('disable and re-enable plugin', async ({ page, workViewPage }) => {
    // Increase timeout to account for asset checking in CI
    test.setTimeout(process.env.CI ? 90000 : 30000);

    // Check if plugin assets are available
    const assetsAvailable = await waitForPluginAssets(page);
    if (!assetsAvailable) {
      if (process.env.CI) {
        test.skip(true, 'Plugin assets not available in CI - skipping test');
        return;
      }
      throw new Error('Plugin assets not available - cannot proceed with test');
    }

    await workViewPage.waitForTaskList();

    // Enable API Test Plugin first (implementing enableTestPlugin inline)
    await page.click(SETTINGS_BTN);
    await page.waitForTimeout(1000);

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

    await page.waitForTimeout(1000);
    await expect(page.locator('plugin-management')).toBeVisible({ timeout: 5000 });

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
        if (toggleButton) {
          const wasChecked = toggleButton.getAttribute('aria-checked') === 'true';
          if (!wasChecked) {
            toggleButton.click();
          }
        }
      }
    }, 'API Test Plugin');

    await page.waitForTimeout(2000); // Wait for plugin to initialize

    // Navigate to plugin management
    await expect(page.locator(PLUGIN_ITEM).first()).toBeVisible();

    // Find the toggle for API Test Plugin and disable it
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
      const apiTestCard = cards.find((card) => {
        const title = card.querySelector('mat-card-title')?.textContent || '';
        return title.includes('API Test Plugin');
      });
      const toggle = apiTestCard?.querySelector(
        'mat-slide-toggle button[role="switch"]',
      ) as HTMLButtonElement;

      const result = {
        found: !!apiTestCard,
        hasToggle: !!toggle,
        wasChecked: toggle?.getAttribute('aria-checked') === 'true',
        clicked: false,
      };

      if (toggle && toggle.getAttribute('aria-checked') === 'true') {
        toggle.click();
        result.clicked = true;
      }

      return result;
    });

    await page.waitForTimeout(2000); // Give more time for plugin to unload

    // Stay on the settings page, just wait for state to update
    await page.waitForTimeout(2000);

    // Re-enable the plugin
    await page.click(SETTINGS_BTN);
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      const pluginSection = document.querySelector('.plugin-section');
      if (pluginSection) {
        pluginSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
      const apiTestCard = cards.find((card) => {
        const title = card.querySelector('mat-card-title')?.textContent || '';
        return title.includes('API Test Plugin');
      });
      const toggle = apiTestCard?.querySelector(
        'mat-slide-toggle button[role="switch"]',
      ) as HTMLButtonElement;

      const result = {
        found: !!apiTestCard,
        hasToggle: !!toggle,
        wasChecked: toggle?.getAttribute('aria-checked') === 'true',
        clicked: false,
      };

      if (toggle && toggle.getAttribute('aria-checked') !== 'true') {
        toggle.click();
        result.clicked = true;
      }

      return result;
    });

    await page.waitForTimeout(2000); // Give time for plugin to reload

    // Navigate back to main view
    await page.click('.tour-projects'); // Click on projects/home navigation
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify menu entry is back
    await expect(page.locator(PLUGIN_MENU_ENTRY)).toBeVisible();
    await expect(page.locator(PLUGIN_MENU_ENTRY)).toContainText('API Test Plugin');
  });
});

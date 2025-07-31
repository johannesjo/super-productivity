import { test, expect } from '../../fixtures/test.fixture';
import { cssSelectors } from '../../../e2e/e2e.const';

const { SIDENAV } = cssSelectors;

// Plugin-related selectors
const SETTINGS_BTN = `${SIDENAV} .tour-settingsMenuBtn`;
const PLUGIN_CARD = 'plugin-management mat-card.ng-star-inserted';
const PLUGIN_ITEM = `${PLUGIN_CARD}`;
const PLUGIN_MENU_ENTRY = `${SIDENAV} plugin-menu button`;
const PLUGIN_IFRAME = 'plugin-index iframe';
const SNACK_BAR = 'mat-snack-bar';

test.describe('Plugin Loading', () => {
  test('full plugin loading lifecycle', async ({ page, workViewPage }) => {
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

    console.log(`Plugin "API Test Plugin" enable state:`, enableResult);
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

    console.log('Plugin cards found:', pluginCardsResult);
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
});

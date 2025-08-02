import { test, expect } from '../../fixtures/test.fixture';
import { cssSelectors } from '../../../e2e/e2e.const';

const { SIDENAV } = cssSelectors;
const SETTINGS_BTN = `${SIDENAV} .tour-settingsMenuBtn`;

test.describe('Enable Plugin Test', () => {
  test('navigate to plugin settings and enable API Test Plugin', async ({
    page,
    workViewPage,
  }) => {
    await workViewPage.waitForTaskList();

    // Navigate to plugin settings
    await page.click(SETTINGS_BTN);
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      const configPage = document.querySelector('.page-settings');
      if (!configPage) {
        console.error('Not on config page');
        return;
      }

      const pluginSection = document.querySelector('.plugin-section');
      if (pluginSection) {
        pluginSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        console.error('Plugin section not found');
        return;
      }

      const collapsible = document.querySelector('.plugin-section collapsible');
      if (collapsible) {
        const isExpanded = collapsible.classList.contains('isExpanded');
        if (!isExpanded) {
          const header = collapsible.querySelector('.collapsible-header');
          if (header) {
            (header as HTMLElement).click();
            console.log('Clicked to expand plugin collapsible');
          } else {
            console.error('Could not find collapsible header');
          }
        } else {
          console.log('Plugin collapsible already expanded');
        }
      } else {
        console.error('Plugin collapsible not found');
      }
    });

    await page.waitForTimeout(1000);
    await expect(page.locator('plugin-management')).toBeVisible({ timeout: 5000 });

    await page.waitForLoadState('networkidle');

    // Check if plugin-management has any content
    const contentResult = await page.evaluate(() => {
      const pluginMgmt = document.querySelector('plugin-management');
      const matCards = pluginMgmt ? pluginMgmt.querySelectorAll('mat-card') : [];

      // Filter out warning card
      const pluginCards = Array.from(matCards).filter((card) => {
        return card.querySelector('mat-slide-toggle') !== null;
      });

      return {
        pluginMgmtExists: !!pluginMgmt,
        totalCardCount: matCards.length,
        pluginCardCount: pluginCards.length,
        pluginCardTexts: pluginCards.map(
          (card) => card.querySelector('mat-card-title')?.textContent?.trim() || '',
        ),
      };
    });

    console.log('Plugin management content:', contentResult);

    await page.waitForTimeout(1000);

    // Try to find and enable the API Test Plugin (which exists by default)
    const enableResult = await page.evaluate(() => {
      const pluginCards = document.querySelectorAll('plugin-management mat-card');
      let foundApiTestPlugin = false;
      let toggleClicked = false;

      for (const card of Array.from(pluginCards)) {
        const title = card.querySelector('mat-card-title')?.textContent || '';
        if (title.includes('API Test Plugin') || title.includes('api-test-plugin')) {
          foundApiTestPlugin = true;
          const toggle = card.querySelector(
            'mat-slide-toggle button[role="switch"]',
          ) as HTMLButtonElement;
          if (toggle && toggle.getAttribute('aria-checked') !== 'true') {
            toggle.click();
            toggleClicked = true;
            break;
          }
        }
      }

      return {
        totalPluginCards: pluginCards.length,
        foundApiTestPlugin,
        toggleClicked,
      };
    });

    console.log('Plugin enablement result:', enableResult);
    expect(enableResult.foundApiTestPlugin).toBe(true);

    await page.waitForLoadState('networkidle'); // Wait for plugin to initialize

    // Now check if plugin menu has buttons
    const finalMenuState = await page.evaluate(() => {
      const pluginMenu = document.querySelector('side-nav plugin-menu');
      const buttons = pluginMenu ? pluginMenu.querySelectorAll('button') : [];
      return {
        pluginMenuExists: !!pluginMenu,
        buttonCount: buttons.length,
        buttonTexts: Array.from(buttons).map((btn) => btn.textContent?.trim() || ''),
      };
    });

    console.log('Final plugin menu state:', finalMenuState);
  });
});

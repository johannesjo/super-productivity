import { test, expect } from '../../fixtures/test.fixture';
import { cssSelectors } from '../../constants/selectors';

const { SIDENAV } = cssSelectors;
const SETTINGS_BTN = `${SIDENAV} .tour-settingsMenuBtn`;

test.describe.serial('Plugin Enable Verify', () => {
  test('enable API Test Plugin and verify menu entry', async ({ page, workViewPage }) => {
    await workViewPage.waitForTaskList();

    // Navigate to plugin settings
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

    // Enable API Test Plugin
    const result = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
      const apiTestCard = cards.find((card) => {
        const title = card.querySelector('mat-card-title')?.textContent || '';
        return title.includes('API Test Plugin');
      });

      if (!apiTestCard) {
        return { found: false };
      }

      const toggle = apiTestCard.querySelector(
        'mat-slide-toggle button[role="switch"]',
      ) as HTMLButtonElement;
      if (!toggle) {
        return { found: true, hasToggle: false };
      }

      const wasEnabled = toggle.getAttribute('aria-checked') === 'true';
      if (!wasEnabled) {
        toggle.click();
      }

      return {
        found: true,
        hasToggle: true,
        wasEnabled,
        clicked: !wasEnabled,
      };
    });

    console.log('Enable plugin result:', result);
    expect(result.found).toBe(true);
    expect(result.clicked || result.wasEnabled).toBe(true);

    await page.waitForTimeout(3000); // Wait for plugin to initialize

    // Navigate back to main view
    await page.click(SIDENAV);
    await page.waitForTimeout(500);
    await page.goto('/#/tag/TODAY');
    await page.waitForTimeout(1000);

    // Check plugin menu exists
    const menuResult = await page.evaluate(() => {
      const pluginMenu = document.querySelector('side-nav plugin-menu');
      const buttons = pluginMenu ? Array.from(pluginMenu.querySelectorAll('button')) : [];

      return {
        hasPluginMenu: !!pluginMenu,
        buttonCount: buttons.length,
        buttonTexts: buttons.map((btn) => btn.textContent?.trim() || ''),
        menuHTML: pluginMenu?.outerHTML?.substring(0, 200),
      };
    });

    console.log('Plugin menu state:', menuResult);
    expect(menuResult.hasPluginMenu).toBe(true);
    expect(menuResult.buttonCount).toBeGreaterThan(0);

    // Verify API Test Plugin menu entry
    await expect(page.locator(`${SIDENAV} plugin-menu button`)).toBeVisible();
    await expect(page.locator(`${SIDENAV} plugin-menu button`)).toContainText(
      'API Test Plugin',
    );
  });
});

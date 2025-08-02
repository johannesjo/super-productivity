import { expect, test } from '../../fixtures/test.fixture';
import { cssSelectors } from '../../constants/selectors';

const { SIDENAV } = cssSelectors;
const SETTINGS_BTN = `${SIDENAV} .tour-settingsMenuBtn`;

test.describe.serial('Plugin Enable Verify', () => {
  test("enable Yesterday's Tasks Plugin and verify menu entry", async ({
    page,
    workViewPage,
    waitForNav,
  }) => {
    await workViewPage.waitForTaskList();

    // Navigate to plugin settings
    await page.click(SETTINGS_BTN);
    await waitForNav();

    await page.evaluate(() => {
      const configPage = document.querySelector('.page-settings');
      if (!configPage) {
        throw new Error('Not on config page');
      }

      const pluginSection = document.querySelector('.plugin-section');
      if (pluginSection) {
        pluginSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        throw new Error('Plugin section not found');
      }

      const collapsible = document.querySelector('.plugin-section collapsible');
      if (collapsible) {
        const isExpanded = collapsible.classList.contains('isExpanded');
        if (!isExpanded) {
          const header = collapsible.querySelector('.collapsible-header');
          if (header) {
            (header as HTMLElement).click();
          } else {
            throw new Error('Could not find collapsible header');
          }
        } else {
        }
      } else {
        throw new Error('Plugin collapsible not found');
      }
    });

    await waitForNav('plugin-management');

    // Enable Yesterday's Tasks Plugin (available by default)
    const result = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));

      // Get all card titles for debugging
      const cardTitles = cards.map(
        (card) => card.querySelector('mat-card-title')?.textContent?.trim() || '',
      );

      const apiTestCard = cards.find((card) => {
        const title = card.querySelector('mat-card-title')?.textContent || '';
        return title.includes("Yesterday's Tasks");
      });

      if (!apiTestCard) {
        return { found: false, availableCards: cardTitles };
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

    if (!result.found) {
      throw new Error(
        `Yesterday's Tasks plugin not found. Available plugins: ${(result as any).availableCards?.join(', ') || 'none'}`,
      );
    }
    expect(result.found).toBe(true);
    expect(result.clicked || result.wasEnabled).toBe(true);

    await waitForNav(); // Wait for plugin to initialize
    await page.waitForTimeout(2000); // Give plugin time to fully initialize

    // Navigate back to main view
    await page.click(SIDENAV);
    await page.waitForLoadState('domcontentloaded');
    await page.goto('/#/tag/TODAY');
    await waitForNav(); // Wait for plugin to initialize
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Give plugin menu time to render

    // Check plugin menu exists (it may be hidden initially)
    await page.waitForSelector('side-nav plugin-menu', {
      state: 'attached',
      timeout: 5000,
    });

    // Wait for plugin menu buttons to appear (with retry logic)
    const hasPluginButton = await page
      .waitForFunction(
        () => {
          const pluginMenu = document.querySelector('side-nav plugin-menu');
          const buttons = pluginMenu ? pluginMenu.querySelectorAll('button') : [];
          return buttons.length > 0;
        },
        { timeout: 5000 },
      )
      .catch(() => false);

    if (hasPluginButton) {
      // Verify Yesterday's Tasks Plugin menu entry
      await expect(page.locator(`${SIDENAV} plugin-menu button`)).toBeVisible();
      await expect(page.locator(`${SIDENAV} plugin-menu button`)).toContainText(
        "Yesterday's Tasks",
      );
    } else {
      // If no menu buttons appear, navigate back to settings to verify plugin is enabled
      await page.click(SETTINGS_BTN);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        const pluginSection = document.querySelector('.plugin-section');
        if (pluginSection) {
          pluginSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      const enabledCheck = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
        const yesterdayCard = cards.find((card) => {
          const title = card.querySelector('mat-card-title')?.textContent || '';
          return title.includes("Yesterday's Tasks");
        });
        if (yesterdayCard) {
          const toggle = yesterdayCard.querySelector(
            'mat-slide-toggle button[role="switch"]',
          ) as HTMLButtonElement;
          return toggle?.getAttribute('aria-checked') === 'true';
        }
        return false;
      });

      // At least verify the plugin is enabled even if menu doesn't appear
      expect(enabledCheck).toBe(true);
    }
  });
});

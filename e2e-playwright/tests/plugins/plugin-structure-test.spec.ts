import { test, expect } from '../../fixtures/app.fixture';
import { PluginSettingsPage } from '../../pages/plugin-settings.page';

test.describe('Plugin Structure Test', () => {
  test('check plugin card structure', async ({ page }) => {
    // Increase timeout for this test
    test.setTimeout(30000);

    const pluginSettings = new PluginSettingsPage(page);

    // Navigate to plugin settings
    try {
      await pluginSettings.navigateToPluginSettings();
    } catch (error) {
      console.log('Failed to navigate via helper, trying direct navigation');
      // Fallback to direct navigation
      await page.goto('/config');
      await page.waitForTimeout(2000);
    }

    await page.waitForTimeout(1000);

    // Check if plugin management is present
    const hasPluginManagement = await page.locator('plugin-management').count();
    console.log('Plugin management element found:', hasPluginManagement > 0);

    // Execute DOM inspection for API Test Plugin
    const pluginCardStructure = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
      console.log('Total plugin cards found:', cards.length);

      const apiTestCard = cards.find((card) => {
        const title = card.querySelector('mat-card-title')?.textContent || '';
        return title.includes('API Test Plugin');
      });

      if (!apiTestCard) {
        // Log all card titles for debugging
        const allTitles = cards.map(
          (card) =>
            card.querySelector('mat-card-title')?.textContent?.trim() || 'No title',
        );
        return { found: false, availableCards: allTitles };
      }

      // Look for all possible toggle selectors
      const toggleSelectors = [
        'mat-slide-toggle input',
        'mat-slide-toggle button',
        '.mat-mdc-slide-toggle input',
        '.mat-mdc-slide-toggle button',
        '[role="switch"]',
        'input[type="checkbox"]',
      ];

      const toggleResults = toggleSelectors.map((selector) => ({
        selector,
        found: !!apiTestCard.querySelector(selector),
        element: apiTestCard.querySelector(selector)?.tagName,
      }));

      // Get the card's inner HTML structure
      const cardStructure = apiTestCard.innerHTML.substring(0, 500);

      return {
        found: true,
        cardTitle: apiTestCard.querySelector('mat-card-title')?.textContent,
        toggleResults,
        cardStructure,
        hasMatSlideToggle: !!apiTestCard.querySelector('mat-slide-toggle'),
        allInputs: Array.from(apiTestCard.querySelectorAll('input')).map((input) => ({
          type: input.type,
          id: input.id,
          class: input.className,
        })),
      };
    });

    // Log the plugin card structure
    console.log('Plugin card structure:', JSON.stringify(pluginCardStructure, null, 2));

    // Assert that the API Test Plugin card was found
    if (!pluginCardStructure.found) {
      console.log('Available cards:', pluginCardStructure.availableCards);
    }
    expect(pluginCardStructure.found).toBe(true);
    expect(pluginCardStructure.cardTitle).toContain('API Test Plugin');

    // Verify mat-slide-toggle is present
    expect(pluginCardStructure.hasMatSlideToggle).toBe(true);

    // Verify at least one toggle selector was found
    const foundToggles = pluginCardStructure.toggleResults.filter((r) => r.found);
    expect(foundToggles.length).toBeGreaterThan(0);

    // Log details for debugging
    console.log('Toggle results:', pluginCardStructure.toggleResults);
    console.log('All inputs found:', pluginCardStructure.allInputs);
  });
});

import { test, expect } from '@playwright/test';
import { PluginSettingsPage } from '../../pages/plugin-settings.page';

test.describe('Plugin Structure Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Click away welcome dialog if present
    await page
      .getByRole('button', { name: 'I understand' })
      .click({ timeout: 5000 })
      .catch(() => {});
  });

  test('check plugin card structure', async ({ page }) => {
    const pluginSettings = new PluginSettingsPage(page);

    // Navigate to plugin settings
    await pluginSettings.navigateToPluginSettings();

    // Wait a bit for the page to fully load
    await page.waitForTimeout(1000);

    // Get plugin card structure information
    const pluginCardStructure = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));

      // Find the API Test Plugin card
      const apiTestCard = cards.find((card) => {
        const title = card.querySelector('mat-card-title')?.textContent || '';
        return title.includes('API Test Plugin');
      });

      if (!apiTestCard) {
        return { found: false };
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

      // Get the card's inner HTML structure (first 500 chars)
      const cardStructure = apiTestCard.innerHTML.substring(0, 500);

      // Get all inputs in the card
      const allInputs = Array.from(apiTestCard.querySelectorAll('input')).map(
        (input) => ({
          type: input.type,
          id: input.id,
          class: input.className,
        }),
      );

      return {
        found: true,
        cardTitle: apiTestCard.querySelector('mat-card-title')?.textContent?.trim(),
        toggleResults,
        cardStructure,
        hasMatSlideToggle: !!apiTestCard.querySelector('mat-slide-toggle'),
        allInputs,
      };
    });

    // Log the plugin card structure for debugging (commented out to reduce noise)
    // console.log('Plugin card structure:', JSON.stringify(pluginCardStructure, null, 2));

    // Verify the API Test Plugin card was found
    expect(pluginCardStructure.found).toBe(true);

    // Verify the card has the expected title
    expect(pluginCardStructure.cardTitle).toContain('API Test Plugin');

    // Verify that at least one toggle control exists
    const hasAnyToggle = pluginCardStructure.toggleResults.some((result) => result.found);
    expect(hasAnyToggle).toBe(true);

    // Log detailed information about toggle controls found (commented out to reduce noise)
    // console.log('Toggle control analysis:');
    // pluginCardStructure.toggleResults.forEach((result) => {
    //   if (result.found) {
    //     console.log(`  ✓ Found: ${result.selector} (${result.element})`);
    //   }
    // });

    // Log information about all inputs found
    // if (pluginCardStructure.allInputs.length > 0) {
    //   console.log('All inputs in card:', pluginCardStructure.allInputs);
    // }
  });
});

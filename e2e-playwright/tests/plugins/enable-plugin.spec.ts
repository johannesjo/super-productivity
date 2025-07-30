import { test, expect } from '../../fixtures/app.fixture';
import { PluginSettingsPage } from '../../pages/plugin-settings.page';

test.describe('Plugin Management', () => {
  test.skip('navigate to plugin settings and enable API Test Plugin', async ({
    page,
  }) => {
    const pluginSettings = new PluginSettingsPage(page);

    // Navigate to plugin settings
    await pluginSettings.navigateToPluginSettings();
    await page.waitForTimeout(2000);

    // Check plugin management content
    const pluginCards = await pluginSettings.getPluginCards();
    console.log('Found plugin cards:', pluginCards.length);
    pluginCards.forEach(({ title }) => console.log('Plugin:', title));

    // Find and enable API Test Plugin
    const wasEnabled = await pluginSettings.enablePlugin('API Test Plugin');
    console.log(
      'Plugin enablement result:',
      wasEnabled ? 'Enabled' : 'Already enabled or not found',
    );

    // Verify at least one plugin card was found
    expect(pluginCards.length).toBeGreaterThan(0);

    // Wait for plugin to initialize
    await page.waitForTimeout(3000);

    // Check if plugin menu has buttons
    const menuButtons = await pluginSettings.getPluginMenuButtons();
    console.log('Plugin menu buttons:', menuButtons);

    // The test expects that after enabling a plugin, the menu might be updated
    // This assertion might need adjustment based on actual behavior
    await expect(pluginSettings.pluginMenu).toBeVisible();
  });
});

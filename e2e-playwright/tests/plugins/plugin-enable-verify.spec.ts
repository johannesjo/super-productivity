import { test, expect } from '@playwright/test';
import { PluginSettingsPage } from '../../pages/plugin-settings.page';

test.describe('Plugin Enable and Verify', () => {
  test.setTimeout(30000); // Increase timeout for plugin operations

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Click away welcome dialog if present
    await page
      .getByRole('button', { name: 'I understand' })
      .click({ timeout: 5000 })
      .catch(() => {});
  });

  test('should enable API Test Plugin and verify menu entry', async ({ page }) => {
    const pluginSettings = new PluginSettingsPage(page);

    // Step 1: Navigate to plugin settings
    await pluginSettings.navigateToPluginSettings();

    // Step 2: Enable API Test Plugin
    await pluginSettings.enablePlugin('API Test Plugin');

    // Verify plugin was found and enabled/already enabled
    const pluginCards = await pluginSettings.getPluginCards();
    const apiTestPlugin = pluginCards.find((card) =>
      card.title.includes('API Test Plugin'),
    );
    expect(apiTestPlugin).toBeTruthy();

    // Wait for plugin to initialize
    await page.waitForTimeout(3000);

    // Step 3: Navigate back to main view
    await page.locator('side-nav').click();
    await page.waitForTimeout(500);
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Step 4: Verify plugin-menu exists in side-nav
    const pluginMenu = page.locator('side-nav plugin-menu');
    await expect(pluginMenu).toBeVisible();

    // Step 5: Verify API Test Plugin button exists in plugin menu
    const pluginMenuButton = pluginMenu
      .locator('button')
      .filter({ hasText: 'API Test Plugin' });
    await expect(pluginMenuButton).toBeVisible();

    // Additional verification: Get all plugin menu buttons
    const pluginMenuButtons = await pluginSettings.getPluginMenuButtons();
    const hasApiTestPlugin = pluginMenuButtons.some((text) =>
      text.includes('API Test Plugin'),
    );
    expect(hasApiTestPlugin).toBeTruthy();
  });
});

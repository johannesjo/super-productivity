import { expect, test } from '../../fixtures/test.fixture';
import { cssSelectors } from '../../constants/selectors';
import * as path from 'path';

const { SETTINGS_BTN } = cssSelectors;
const FILE_INPUT = 'input[type="file"][accept=".zip"]';
const TEST_PLUGIN_ID = 'test-upload-plugin';

test.describe('Plugin Simple Enable', () => {
  test('upload and enable test plugin', async ({ page, workViewPage, waitForNav }) => {
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

    await waitForNav();
    await expect(page.locator('plugin-management')).toBeVisible({ timeout: 5000 });

    // Upload plugin ZIP file
    const testPluginPath = path.resolve(__dirname, '../../../src/assets/test-plugin.zip');

    // Make file input visible for testing
    await page.evaluate(() => {
      const input = document.querySelector(
        'input[type="file"][accept=".zip"]',
      ) as HTMLElement;
      if (input) {
        input.style.display = 'block';
        input.style.position = 'relative';
        input.style.opacity = '1';
      }
    });

    await page.locator(FILE_INPUT).setInputFiles(testPluginPath);
    await waitForNav();

    // Check if plugin was uploaded
    const pluginExists = await page.evaluate((pluginId: string) => {
      const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
      return cards.some((card) => card.textContent?.includes(pluginId));
    }, TEST_PLUGIN_ID);

    expect(pluginExists).toBeTruthy();

    // Enable the plugin
    const enableResult = await page.evaluate((pluginId: string) => {
      const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
      const targetCard = cards.find((card) => card.textContent?.includes(pluginId));
      if (targetCard) {
        const toggle = targetCard.querySelector(
          'mat-slide-toggle button[role="switch"]',
        ) as HTMLButtonElement;
        if (toggle && toggle.getAttribute('aria-checked') !== 'true') {
          toggle.click();
          return true;
        }
      }
      return false;
    }, TEST_PLUGIN_ID);

    expect(enableResult).toBeTruthy();
    await waitForNav();

    // Verify plugin is enabled
    const isEnabled = await page.evaluate((pluginId: string) => {
      const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
      const targetCard = cards.find((card) => card.textContent?.includes(pluginId));
      if (targetCard) {
        const toggle = targetCard.querySelector(
          'mat-slide-toggle button[role="switch"]',
        ) as HTMLButtonElement;
        return toggle?.getAttribute('aria-checked') === 'true';
      }
      return false;
    }, TEST_PLUGIN_ID);

    expect(isEnabled).toBeTruthy();

    // The test plugin has isSkipMenuEntry: true, so no menu entry should appear
    // and iFrame: false, so no iframe view
  });
});

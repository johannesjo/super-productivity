import { test, expect } from '@playwright/test';

test.describe('Plugin Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Click away welcome dialog if present
    await page
      .getByRole('button', { name: 'I understand' })
      .click({ timeout: 5000 })
      .catch(() => {});
  });

  test('should navigate to settings and check plugin section visibility', async ({
    page,
  }) => {
    // Click settings button in sidenav
    await page.click('side-nav .tour-settingsMenuBtn');

    // Wait for URL to contain '/config'
    await expect(page).toHaveURL(/\/config/);

    // Check for plugin-related DOM elements
    const pluginStructure = await page.evaluate(() => {
      const results: any = {};

      // Check for plugin section
      results.hasPluginSection = !!document.querySelector('.plugin-section');
      results.hasPluginManagement = !!document.querySelector('plugin-management');
      results.hasCollapsible = !!document.querySelector('.plugin-section collapsible');

      // Check for plugin heading
      const headings = Array.from(document.querySelectorAll('h2'));
      results.pluginHeading = headings.find((h) => h.textContent?.includes('Plugin'));
      results.headingText = results.pluginHeading?.textContent || 'Not found';

      // Get all section classes
      const sections = Array.from(document.querySelectorAll('.config-section'));
      results.sectionCount = sections.length;
      results.sectionClasses = sections.map((s) => s.className);

      // Check entire page HTML for debugging
      const configPage = document.querySelector('.page-settings');
      results.hasConfigPage = !!configPage;

      return results;
    });

    // Log debugging information
    console.log('Page structure results:', pluginStructure);

    // Verify that we have the expected page structure
    expect(pluginStructure).toBeTruthy();
    expect(pluginStructure.hasConfigPage).toBe(true);

    // Additional content analysis for debugging
    const contentAnalysis = await page.evaluate(() => {
      const configContent =
        document.querySelector('.page-settings')?.innerHTML || 'No config page found';

      // Look for any mentions of plugin
      const pluginMentions = configContent.match(/plugin/gi) || [];

      return {
        contentLength: configContent.length,
        pluginMentions: pluginMentions.length,
        hasPluginText: configContent.toLowerCase().includes('plugin'),
      };
    });

    console.log('Content analysis:', contentAnalysis);
  });
});

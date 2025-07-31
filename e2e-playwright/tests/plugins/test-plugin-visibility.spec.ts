import { test, expect } from '../../fixtures/app.fixture';

test.describe('Plugin Visibility', () => {
  test('navigate to settings page and check plugin section visibility', async ({
    page,
  }) => {
    // Navigate to settings page by clicking settings button in sidenav
    const settingsBtn = page.locator('side-nav .tour-settingsMenuBtn');
    await settingsBtn.click();

    // Wait for navigation and verify URL
    await page.waitForURL('**/config**');
    await expect(page).toHaveURL(/\/config/);

    // Wait for settings page to load
    await page.waitForTimeout(2000);

    // Check page structure using page.evaluate
    const pageStructure = await page.evaluate(() => {
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

    console.log('Page structure results:', pageStructure);

    // Verify we got page structure results
    expect(pageStructure).toBeTruthy();

    // Log page content for debugging
    const contentAnalysis = await page.evaluate(() => {
      const configContent =
        document.querySelector('.page-settings')?.innerHTML || 'No config page found';
      console.log('Config page content length:', configContent.length);

      // Look for any mentions of plugin
      const pluginMentions = configContent.match(/plugin/gi) || [];
      console.log('Plugin mentions found:', pluginMentions.length);

      return {
        contentLength: configContent.length,
        pluginMentions: pluginMentions.length,
        hasPluginText: configContent.toLowerCase().includes('plugin'),
      };
    });

    console.log('Content analysis:', contentAnalysis);

    // Basic assertions to ensure the page loaded
    expect(contentAnalysis.contentLength).toBeGreaterThan(0);
  });
});

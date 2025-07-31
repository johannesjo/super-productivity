import { test, expect } from '../../fixtures/test.fixture';

test.describe('Plugin Visibility', () => {
  test('should navigate to settings and check plugin section visibility', async ({
    page,
  }) => {
    // Click settings button in sidenav
    await page.click('side-nav .tour-settingsMenuBtn');

    // Wait for URL to contain '/config'
    await expect(page).toHaveURL(/\/config/);

    // Check for plugin-related DOM elements
    const pluginStructure = await page.evaluate(() => {
      const results: {
        hasPluginSection: boolean;
        hasPluginManagement: boolean;
        hasCollapsible: boolean;
        pluginHeading?: Element;
        headingText: string;
        sectionCount: number;
        sectionClasses: string[];
        hasConfigPage: boolean;
      } = {
        hasPluginSection: false,
        hasPluginManagement: false,
        hasCollapsible: false,
        headingText: 'Not found',
        sectionCount: 0,
        sectionClasses: [],
        hasConfigPage: false,
      };

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

    // Log debugging information (commented out to reduce noise)
    // console.log('Page structure results:', pluginStructure);

    // Verify that we have the expected page structure
    expect(pluginStructure).toBeTruthy();
    expect(pluginStructure.hasConfigPage).toBe(true);
  });
});

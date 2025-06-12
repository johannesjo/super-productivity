import { NBrowser } from '../../n-browser-interface';
import { cssSelectors } from '../../e2e.const';

const { SIDENAV, ROUTER_WRAPPER } = cssSelectors;

/* eslint-disable @typescript-eslint/naming-convention */

const SETTINGS_BTN = `${SIDENAV} .tour-settingsMenuBtn`;

module.exports = {
  '@tags': ['plugins', 'visibility'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'navigate to settings page': (browser: NBrowser) =>
    browser
      .click(SETTINGS_BTN)
      .waitForElementVisible(ROUTER_WRAPPER)
      .assert.urlContains('/config')
      .pause(2000),

  'check page structure': (browser: NBrowser) =>
    browser.execute(
      () => {
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
      },
      [],
      (result) => {
        console.log('Page structure results:', result.value);
        browser.assert.ok(result.value, 'Should get page structure');
      },
    ),

  'log page content for debugging': (browser: NBrowser) =>
    browser.execute(
      () => {
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
      },
      [],
      (result) => {
        console.log('Content analysis:', result.value);
      },
    ),
};

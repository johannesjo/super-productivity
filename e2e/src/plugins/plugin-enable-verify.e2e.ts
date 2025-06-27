/* eslint-disable @typescript-eslint/naming-convention */
import { NBrowser } from '../../n-browser-interface';
import { cssSelectors } from '../../e2e.const';

const { SIDENAV } = cssSelectors;

module.exports = {
  '@tags': ['plugins', 'verify'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'enable API Test Plugin': (browser: NBrowser) =>
    browser
      .navigateToPluginSettings()
      .pause(1000)
      .execute(
        () => {
          const cards = Array.from(
            document.querySelectorAll('plugin-management mat-card'),
          );
          const apiTestCard = cards.find((card) => {
            const title = card.querySelector('mat-card-title')?.textContent || '';
            return title.includes('API Test Plugin');
          });

          if (!apiTestCard) {
            return { found: false };
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
        },
        [],
        (result) => {
          console.log('Enable plugin result:', result.value);
          browser.assert.ok(
            (result.value as any).found,
            'API Test Plugin should be found',
          );
          browser.assert.ok(
            (result.value as any).clicked || (result.value as any).wasEnabled,
            'API Test Plugin should be enabled or was already enabled',
          );
        },
      )
      .pause(3000), // Wait for plugin to initialize

  'navigate back to main view': (browser: NBrowser) =>
    browser.click(SIDENAV).pause(500).url('http://localhost:4200').pause(1000),

  'check plugin menu exists': (browser: NBrowser) =>
    browser.execute(
      () => {
        const pluginMenu = document.querySelector('side-nav plugin-menu');
        const buttons = pluginMenu
          ? Array.from(pluginMenu.querySelectorAll('button'))
          : [];

        return {
          hasPluginMenu: !!pluginMenu,
          buttonCount: buttons.length,
          buttonTexts: buttons.map((btn) => btn.textContent?.trim() || ''),
          menuHTML: pluginMenu?.outerHTML?.substring(0, 200),
        };
      },
      [],
      (result) => {
        console.log('Plugin menu state:', result.value);
        browser.assert.ok(
          (result.value as any).hasPluginMenu,
          'Plugin menu should exist',
        );
        browser.assert.ok(
          (result.value as any).buttonCount > 0,
          'Plugin menu should have buttons',
        );
      },
    ),

  'verify API Test Plugin menu entry': (browser: NBrowser) =>
    browser
      .waitForElementVisible(`${SIDENAV} plugin-menu button`)
      .assert.textContains(`${SIDENAV} plugin-menu button`, 'API Test Plugin'),
};

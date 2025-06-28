/* eslint-disable @typescript-eslint/naming-convention */
import { NBrowser } from '../../n-browser-interface';

module.exports = {
  '@tags': ['plugins', 'enable'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'navigate to plugin settings and enable API Test Plugin': (browser: NBrowser) =>
    browser
      .navigateToPluginSettings()
      .pause(2000)
      // Check if plugin-management has any content
      .execute(
        () => {
          const pluginMgmt = document.querySelector('plugin-management');
          const matCards = pluginMgmt ? pluginMgmt.querySelectorAll('mat-card') : [];

          // Filter out warning card
          const pluginCards = Array.from(matCards).filter((card) => {
            return card.querySelector('mat-slide-toggle') !== null;
          });

          return {
            pluginMgmtExists: !!pluginMgmt,
            totalCardCount: matCards.length,
            pluginCardCount: pluginCards.length,
            pluginCardTexts: pluginCards.map(
              (card) => card.querySelector('mat-card-title')?.textContent?.trim() || '',
            ),
          };
        },
        [],
        (result) => {
          console.log('Plugin management content:', result.value);
        },
      )
      .pause(1000)
      // Try to find and enable the API Test Plugin (which exists by default)
      .execute(
        () => {
          const pluginCards = document.querySelectorAll('plugin-management mat-card');
          let foundApiTestPlugin = false;
          let toggleClicked = false;

          for (const card of Array.from(pluginCards)) {
            const title = card.querySelector('mat-card-title')?.textContent || '';
            if (title.includes('API Test Plugin') || title.includes('api-test-plugin')) {
              foundApiTestPlugin = true;
              const toggle = card.querySelector(
                'mat-slide-toggle button[role="switch"]',
              ) as HTMLButtonElement;
              if (toggle && toggle.getAttribute('aria-checked') !== 'true') {
                toggle.click();
                toggleClicked = true;
                break;
              }
            }
          }

          return {
            totalPluginCards: pluginCards.length,
            foundApiTestPlugin,
            toggleClicked,
          };
        },
        [],
        (result) => {
          console.log('Plugin enablement result:', result.value);
          browser.assert.ok(
            (result.value as any).foundApiTestPlugin,
            'API Test Plugin should be found',
          );
        },
      )
      .pause(3000) // Wait for plugin to initialize

      // Now check if plugin menu has buttons
      .execute(
        () => {
          const pluginMenu = document.querySelector('side-nav plugin-menu');
          const buttons = pluginMenu ? pluginMenu.querySelectorAll('button') : [];
          return {
            pluginMenuExists: !!pluginMenu,
            buttonCount: buttons.length,
            buttonTexts: Array.from(buttons).map((btn) => btn.textContent?.trim() || ''),
          };
        },
        [],
        (result) => {
          console.log('Final plugin menu state:', result.value);
        },
      ),
};

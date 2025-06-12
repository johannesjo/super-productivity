/* eslint-disable @typescript-eslint/naming-convention */
import { NBrowser } from '../../n-browser-interface';

module.exports = {
  '@tags': ['plugins', 'enable'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'navigate to plugin settings and enable hello-world plugin': (browser: NBrowser) =>
    browser
      .navigateToPluginSettings()
      .pause(2000)
      // Check if plugin-management has any content
      .execute(
        () => {
          const pluginMgmt = document.querySelector('plugin-management');
          const matList = pluginMgmt ? pluginMgmt.querySelector('mat-list') : null;
          const listItems = matList ? matList.querySelectorAll('mat-list-item') : [];

          return {
            pluginMgmtExists: !!pluginMgmt,
            matListExists: !!matList,
            listItemCount: listItems.length,
            listItemsText: Array.from(listItems).map(
              (item) => item.textContent?.trim() || '',
            ),
          };
        },
        [],
        (result) => {
          console.log('Plugin management content:', result.value);
        },
      )
      .pause(1000)
      // Try to find and enable the hello-world plugin
      .execute(
        () => {
          const pluginItems = document.querySelectorAll(
            'plugin-management mat-list-item',
          );
          let foundHelloWorld = false;
          let toggleClicked = false;

          for (const item of Array.from(pluginItems)) {
            const text = item.textContent || '';
            if (text.includes('Hello World') || text.includes('hello-world')) {
              foundHelloWorld = true;
              const toggle = item.querySelector(
                '.mat-mdc-slide-toggle input',
              ) as HTMLInputElement;
              if (toggle && !toggle.checked) {
                toggle.click();
                toggleClicked = true;
                break;
              }
            }
          }

          return {
            totalPluginItems: pluginItems.length,
            foundHelloWorld,
            toggleClicked,
          };
        },
        [],
        (result) => {
          console.log('Plugin enablement result:', result.value);
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

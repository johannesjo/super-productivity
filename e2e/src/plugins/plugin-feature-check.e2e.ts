/* eslint-disable @typescript-eslint/naming-convention */
import { NBrowser } from '../../n-browser-interface';

module.exports = {
  '@tags': ['plugins', 'feature-check'],

  before: (browser: NBrowser) => browser,

  after: (browser: NBrowser) => browser.end(),

  'check if PluginService exists': (browser: NBrowser) =>
    browser
      .url('http://localhost:4200')
      .pause(2000)
      .execute(
        () => {
          // Check if Angular is loaded
          const hasAngular = !!(window as any).ng;

          // Try to get the app component
          let hasPluginService = false;
          let errorMessage = '';

          try {
            if (hasAngular) {
              const ng = (window as any).ng;
              const appElement = document.querySelector('app-root');
              if (appElement) {
                const appComponent = ng.getComponent(appElement);
                console.log('App component found:', !!appComponent);

                // Try to find PluginService in injector
                const injector = ng.getInjector(appElement);
                console.log('Injector found:', !!injector);

                // Log available service tokens
                if (injector && injector.get) {
                  try {
                    // Try common service names
                    const possibleNames = ['PluginService', 'pluginService'];
                    for (const name of possibleNames) {
                      try {
                        const service = injector.get(name);
                        if (service) {
                          hasPluginService = true;
                          console.log(`Found service with name: ${name}`);
                          break;
                        }
                      } catch (e: any) {
                        // Service not found with this name
                      }
                    }
                  } catch (e: any) {
                    errorMessage = e.toString();
                  }
                }
              }
            }
          } catch (e: any) {
            errorMessage = e.toString();
          }

          return {
            hasAngular,
            hasPluginService,
            errorMessage,
          };
        },
        [],
        (result) => {
          console.log('Plugin service check:', result.value);
          if (
            result.value &&
            typeof result.value === 'object' &&
            'hasAngular' in result.value
          ) {
            browser.assert.ok(result.value.hasAngular, 'Angular should be loaded');
          }
        },
      ),

  'check plugin UI elements in DOM': (browser: NBrowser) =>
    browser
      .url('http://localhost:4200/config')
      .pause(3000)
      .execute(
        () => {
          const results: any = {};

          // Check various plugin-related elements
          results.hasPluginManagementTag = !!document.querySelector('plugin-management');
          results.hasPluginSection = !!document.querySelector('.plugin-section');
          results.hasPluginMenu = !!document.querySelector('plugin-menu');
          results.hasPluginHeaderBtns = !!document.querySelector('plugin-header-btns');

          // Check if plugin text appears anywhere
          const bodyText = (document.body as HTMLElement).innerText || '';
          results.hasPluginTextInBody = bodyText.toLowerCase().includes('plugin');

          // Check config page
          const configPage = document.querySelector('.page-settings');
          if (configPage) {
            const configText = (configPage as HTMLElement).innerText || '';
            results.hasPluginTextInConfig = configText.toLowerCase().includes('plugin');
          }

          return results;
        },
        [],
        (result) => {
          console.log('Plugin UI elements:', result.value);
        },
      ),
};

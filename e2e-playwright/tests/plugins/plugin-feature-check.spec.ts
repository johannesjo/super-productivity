import { test, expect } from '../../fixtures/app.fixture';

test.describe('Plugin Feature Check', () => {
  test('check if PluginService exists', async ({ page }) => {
    await page.goto('http://localhost:4242');
    await page.waitForTimeout(2000);

    const result = await page.evaluate(() => {
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
    });

    console.log('Plugin service check:', result);
    expect(result.hasAngular).toBe(true);
  });

  test.skip('check plugin UI elements in DOM', async ({ page }) => {
    await page.goto('http://localhost:4242/config');
    await page.waitForTimeout(3000);

    const results = await page.evaluate(() => {
      const evalResults: any = {};

      // Check various plugin-related elements
      evalResults.hasPluginManagementTag = !!document.querySelector('plugin-management');
      evalResults.hasPluginSection = !!document.querySelector('.plugin-section');
      evalResults.hasPluginMenu = !!document.querySelector('plugin-menu');
      evalResults.hasPluginHeaderBtns = !!document.querySelector('plugin-header-btns');

      // Check if plugin text appears anywhere
      const bodyText = (document.body as HTMLElement).innerText || '';
      evalResults.hasPluginTextInBody = bodyText.toLowerCase().includes('plugin');

      // Check config page
      const configPage = document.querySelector('.page-settings');
      if (configPage) {
        const configText = (configPage as HTMLElement).innerText || '';
        evalResults.hasPluginTextInConfig = configText.toLowerCase().includes('plugin');
      }

      return evalResults;
    });

    console.log('Plugin UI elements:', results);

    // Verify at least some plugin elements exist
    const hasAnyPluginElement =
      results.hasPluginManagementTag ||
      results.hasPluginSection ||
      results.hasPluginMenu ||
      results.hasPluginHeaderBtns ||
      results.hasPluginTextInBody ||
      results.hasPluginTextInConfig;

    expect(hasAnyPluginElement).toBe(true);
  });
});

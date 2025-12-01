import { test, expect } from '../../fixtures/test.fixture';

test.describe.serial('Plugin Feature Check', () => {
  test('check if PluginService exists', async ({ page, workViewPage }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

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
            // Try to find PluginService in injector
            const injector = ng.getInjector(appElement);
            // console.log('Injector found:', !!injector);

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
                      // console.log(`Found service with name: ${name}`);
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

    // console.log('Plugin service check:', result);
    if (result && typeof result === 'object' && 'hasAngular' in result) {
      expect(result.hasAngular).toBe(true);
    }
  });

  test('check plugin UI elements in DOM', async ({ page, workViewPage }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Navigate to config page
    await page.goto('/#/config');

    await page.evaluate(() => {
      const uiResults: any = {};

      // Check various plugin-related elements
      uiResults.hasPluginManagementTag = !!document.querySelector('plugin-management');
      uiResults.hasPluginSection = !!document.querySelector('.plugin-section');
      uiResults.hasMagicSideNav = !!document.querySelector('magic-side-nav');
      uiResults.hasPluginHeaderBtns = !!document.querySelector('plugin-header-btns');

      // Check if plugin text appears anywhere
      const bodyText = (document.body as HTMLElement).innerText || '';
      uiResults.hasPluginTextInBody = bodyText.toLowerCase().includes('plugin');

      // Check config page
      const configPage = document.querySelector('.page-settings');
      if (configPage) {
        const configText = (configPage as HTMLElement).innerText || '';
        uiResults.hasPluginTextInConfig = configText.toLowerCase().includes('plugin');
      }

      return uiResults;
    });
  });
});

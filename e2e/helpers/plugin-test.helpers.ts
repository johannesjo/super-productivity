import { Page } from '@playwright/test';

/**
 * Helper functions for plugin testing with robust loading verification
 */

/**
 * Wait for plugin assets to be available via HTTP
 */
export const waitForPluginAssets = async (
  page: Page,
  maxRetries: number = 10,
  retryDelay: number = 1000,
): Promise<boolean> => {
  const baseUrl = page.url().split('#')[0];
  const testUrl = `${baseUrl}assets/bundled-plugins/api-test-plugin/manifest.json`;

  console.log(`[Plugin Test] Checking plugin assets availability at: ${testUrl}`);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await page.request.get(testUrl);
      if (response.ok()) {
        const manifest = await response.json();
        console.log(`[Plugin Test] Plugin manifest loaded successfully:`, manifest.id);
        return true;
      } else {
        console.log(
          `[Plugin Test] Attempt ${i + 1}/${maxRetries}: HTTP ${response.status()}`,
        );
      }
    } catch (error) {
      console.log(
        `[Plugin Test] Attempt ${i + 1}/${maxRetries}: Error - ${error.message}`,
      );
    }

    if (i < maxRetries - 1) {
      await page.waitForTimeout(retryDelay);
    }
  }

  console.error('[Plugin Test] Failed to load plugin assets after all retries');
  return false;
};

/**
 * Wait for plugin system to be initialized
 */
export const waitForPluginSystemInit = async (
  page: Page,
  timeout: number = 30000,
): Promise<boolean> => {
  console.log('[Plugin Test] Waiting for plugin system initialization...');

  try {
    // Check if plugin system is initialized by looking for plugin management in settings
    const result = await page.waitForFunction(
      () => {
        // Check if we can access the Angular app
        const appRoot = document.querySelector('app-root');
        if (!appRoot) {
          console.log('[Plugin Test] App root not found');
          return false;
        }

        // Check if plugin service exists in Angular's injector (if accessible)
        // This is a more indirect check since we can't directly access Angular internals
        const hasPluginElements =
          document.querySelector('plugin-management') !== null ||
          document.querySelector('plugin-menu') !== null ||
          document.querySelector('[class*="plugin"]') !== null;

        if (hasPluginElements) {
          console.log('[Plugin Test] Plugin elements detected');
        }

        return hasPluginElements;
      },
      { timeout },
    );

    console.log('[Plugin Test] Plugin system initialized');
    return !!result;
  } catch (error) {
    console.error('[Plugin Test] Plugin system initialization timeout:', error.message);
    return false;
  }
};

/**
 * Enable a plugin with robust verification
 */
export const enablePluginWithVerification = async (
  page: Page,
  pluginName: string,
  timeout: number = 15000,
): Promise<boolean> => {
  console.log(`[Plugin Test] Attempting to enable plugin: ${pluginName}`);

  const startTime = Date.now();

  // First, verify the plugin card exists
  const pluginCardResult = await page
    .waitForFunction(
      (name) => {
        const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
        const targetCard = cards.find((card) => {
          const title = card.querySelector('mat-card-title')?.textContent || '';
          return title.includes(name);
        });

        if (targetCard) {
          console.log(`[Plugin Test] Found plugin card for: ${name}`);
          return true;
        }
        return false;
      },
      pluginName,
      { timeout: timeout / 2 },
    )
    .catch(() => null);

  if (!pluginCardResult) {
    console.error(`[Plugin Test] Plugin card not found for: ${pluginName}`);
    return false;
  }

  // Enable the plugin
  const enableResult = await page.evaluate((name) => {
    const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
    const targetCard = cards.find((card) => {
      const title = card.querySelector('mat-card-title')?.textContent || '';
      return title.includes(name);
    });

    if (!targetCard) {
      return { success: false, error: 'Card not found' };
    }

    const toggle = targetCard.querySelector(
      'mat-slide-toggle button[role="switch"]',
    ) as HTMLButtonElement;

    if (!toggle) {
      return { success: false, error: 'Toggle not found' };
    }

    const wasEnabled = toggle.getAttribute('aria-checked') === 'true';
    if (!wasEnabled) {
      toggle.click();
      console.log(`[Plugin Test] Clicked toggle to enable ${name}`);
    } else {
      console.log(`[Plugin Test] ${name} was already enabled`);
    }

    return { success: true, wasEnabled };
  }, pluginName);

  if (!enableResult.success) {
    console.error(`[Plugin Test] Failed to enable plugin: ${enableResult.error}`);
    return false;
  }

  // Wait for the toggle state to update
  await page.waitForFunction(
    (name) => {
      const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
      const targetCard = cards.find((card) => {
        const title = card.querySelector('mat-card-title')?.textContent || '';
        return title.includes(name);
      });

      const toggle = targetCard?.querySelector(
        'mat-slide-toggle button[role="switch"]',
      ) as HTMLButtonElement;

      return toggle?.getAttribute('aria-checked') === 'true';
    },
    pluginName,
    { timeout: timeout - (Date.now() - startTime) },
  );

  console.log(`[Plugin Test] Plugin ${pluginName} enabled successfully`);
  return true;
};

/**
 * Wait for plugin to be fully loaded and visible in menu
 */
export const waitForPluginInMenu = async (
  page: Page,
  pluginName: string,
  timeout: number = 20000,
): Promise<boolean> => {
  console.log(`[Plugin Test] Waiting for ${pluginName} to appear in menu...`);

  try {
    // Navigate to main view to see the menu
    await page.goto('/#/tag/TODAY');

    // Wait for plugin menu to exist
    await page.waitForSelector('plugin-menu', {
      state: 'attached',
      timeout: timeout / 2,
    });

    // Wait for the specific plugin button in the menu
    const result = await page.waitForFunction(
      (name) => {
        const pluginMenu = document.querySelector('plugin-menu');
        if (!pluginMenu) {
          console.log('[Plugin Test] Plugin menu not found');
          return false;
        }

        const buttons = Array.from(pluginMenu.querySelectorAll('button'));
        const found = buttons.some((btn) => {
          const text = btn.textContent?.trim() || '';
          return text.includes(name);
        });

        if (found) {
          console.log(`[Plugin Test] Found ${name} in plugin menu`);
        }

        return found;
      },
      pluginName,
      { timeout },
    );

    console.log(`[Plugin Test] Plugin ${pluginName} is available in menu`);
    return !!result;
  } catch (error) {
    console.error(`[Plugin Test] Plugin ${pluginName} not found in menu:`, error.message);
    return false;
  }
};

/**
 * Debug helper to log current plugin state
 */
export const logPluginState = async (page: Page): Promise<void> => {
  const state = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
    const plugins = cards.map((card) => {
      const title =
        card.querySelector('mat-card-title')?.textContent?.trim() || 'Unknown';
      const toggle = card.querySelector(
        'mat-slide-toggle button[role="switch"]',
      ) as HTMLButtonElement;
      const enabled = toggle?.getAttribute('aria-checked') === 'true';
      return { title, enabled };
    });

    const menuButtons = Array.from(document.querySelectorAll('plugin-menu button')).map(
      (btn) => btn.textContent?.trim() || '',
    );

    return {
      pluginCards: plugins,
      menuEntries: menuButtons,
      hasPluginManagement: !!document.querySelector('plugin-management'),
      hasPluginMenu: !!document.querySelector('plugin-menu'),
    };
  });

  console.log('[Plugin Test] Current plugin state:', JSON.stringify(state, null, 2));
};

/**
 * Get timeout multiplier for CI environment
 */
export const getCITimeoutMultiplier = (): number => {
  return process.env.CI ? 2 : 1;
};

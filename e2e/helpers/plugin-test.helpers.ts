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
  // In CI, increase retries and delay
  if (process.env.CI) {
    maxRetries = 20;
    retryDelay = 3000;
    // Wait for server to be fully ready in CI
    await page.waitForLoadState('networkidle');
    await page.locator('app-root').waitFor({ state: 'visible', timeout: 15000 });
    // Small delay for UI to stabilize
    await page.waitForTimeout(200);
  }

  const baseUrl = page.url().split('#')[0];
  const testUrl = `${baseUrl}assets/bundled-plugins/api-test-plugin/manifest.json`;

  // First ensure the app is loaded
  try {
    await page.waitForSelector('app-root', { state: 'visible', timeout: 30000 });
    await page.waitForSelector('task-list, .tour-settingsMenuBtn', {
      state: 'attached',
      timeout: 20000,
    });
  } catch (e) {
    throw new Error('[Plugin Test] App not fully loaded:', e.message);
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await page.request.get(testUrl);
      if (response.ok()) {
        await response.json();
        return true;
      } else {
        // Debug: Check if basic assets work
        if (response.status() === 404 && i === 3) {
          const iconUrl = `${baseUrl}assets/icons/sp.svg`;
          try {
            await page.request.get(iconUrl);
          } catch (e) {
            console.error(`[Plugin Test] Basic asset test failed:`, e.message);
          }
        }
      }
    } catch (error) {
      console.error(
        `[Plugin Test] Attempt ${i + 1}/${maxRetries}: Error - ${error.message}`,
      );
    }

    if (i < maxRetries - 1) {
      // Wait before retry - network request, so timeout is appropriate here
      await page.waitForTimeout(retryDelay);
    }
  }

  console.error('[Plugin Test] Failed to load plugin assets after all retries');

  // In CI, this might be expected if assets aren't built properly
  if (process.env.CI) {
    console.warn(
      '[Plugin Test] Plugin assets not available in CI - this is a known issue',
    );
  }

  return false;
};

/**
 * Wait for plugin system to be initialized
 */
export const waitForPluginManagementInit = async (
  page: Page,
  timeout: number = 30000,
): Promise<boolean> => {
  // Check if plugin system is initialized by looking for plugin management in settings
  const result = await page.waitForFunction(
    () => {
      // Check if we can access the Angular app
      const appRoot = document.querySelector('app-root');
      if (!appRoot) {
        throw new Error('No root');
      }

      // Check if plugin service exists in Angular's injector (if accessible)
      // This is a more indirect check since we can't directly access Angular internals
      const hasPluginElements =
        document.querySelector('plugin-management') !== null ||
        document.querySelector('plugin-menu') !== null ||
        document.querySelector('[class*="plugin"]') !== null;

      if (!hasPluginElements) {
        throw new Error('Plugin management not ready');
      }

      return hasPluginElements;
    },
    { timeout },
  );

  return !!result;
};

/**
 * Enable a plugin with robust verification
 */
export const enablePluginWithVerification = async (
  page: Page,
  pluginName: string,
  timeout: number = 15000,
): Promise<boolean> => {
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
          return false;
        }

        const buttons = Array.from(pluginMenu.querySelectorAll('button'));
        const found = buttons.some((btn) => {
          const text = btn.textContent?.trim() || '';
          return text.includes(name);
        });

        return found;
      },
      pluginName,
      { timeout },
    );

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
  await page.evaluate(() => {
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

  // Plugin state debugging removed to reduce test output
};

/**
 * Get timeout multiplier for CI environment
 */
export const getCITimeoutMultiplier = (): number => {
  return process.env.CI ? 2 : 1;
};

module.exports = {
  src_folders: ['../out-tsc/e2e/src'],
  output_folder: './e2e-test-results',
  custom_commands_path: 'out-tsc/e2e/commands',
  test_workers: {
    enabled: false,
    workers: 5,
  },
  webdriver: {
    start_process: true,
    port: 9515,
    server_path: require('chromedriver').path,
    cli_args: [],
  },

  test_settings: {
    default: {
      launch_url: 'https://0.0.0.0:4200',
      desiredCapabilities: {
        browserName: 'chrome',
        chromeOptions: {
          args: [
            '--headless',
            '--disable-gpu',
            '--window-size=1280,800',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-browser-side-navigation',
            '--user-agent=NIGHTWATCH',
            `--binary=${process.env.CHROME_BIN}`,
          ],
          prefs: {
            'profile.default_content_setting_values.geolocation': 1,
            'profile.default_content_setting_values.notifications': 2,
          },
        },
      },
      screenshots: {
        enabled: true,
        on_failure: true,
        on_error: true,
        path: './e2e-test-results/screenshots',
      },
      globals: {
        waitForConditionPollInterval: 500,
        waitForConditionTimeout: 10000,
        retryAssertionTimeout: 1000,
        before: async function (browser) {
          // Wait for the browser to be fully initialized
          await new Promise((resolve) => setTimeout(resolve, 1000));

          try {
            // For newer Nightwatch versions (v2+)
            if (browser.chrome && browser.chrome.sendDevToolsCommand) {
              await browser.chrome.sendDevToolsCommand('Emulation.setVirtualTimePolicy', {
                policy: 'pauseIfNetworkFetchesPending',
                initialVirtualTime: new Date('2025-05-09T11:00:00Z').getTime(),
              });
            }
            // Fallback to older method
            else if (browser.driver) {
              const session = await browser.driver.getDevToolsSession();
              await session.send('Emulation.setVirtualTimePolicy', {
                policy: 'pauseIfNetworkFetchesPending',
                initialVirtualTime: new Date('2025-05-09T11:00:00Z').getTime(),
              });
            }
          } catch (err) {
            console.error('Failed to set virtual time policy:', err);
          }
        },
      },
    },
  },
};

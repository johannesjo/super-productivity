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
      persist_globals: true,
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

        beforeEach: async (browser) => {
          //   const today = new Date();
          //   today.setHours(17);
          //   const fakeDateTS = today.getTime();
          //
          //   console.log('XXX');
          //   browser.execute(() => {
          //     console.log('AAAAAAa');
          //     window.e2eTest = true;
          //   });
          //
          //   // For newer Nightwatch versions (v2+)
          //   if (browser.chrome && browser.chrome.sendDevToolsCommand) {
          //     await browser.chrome.sendDevToolsCommand('Emulation.setVirtualTimePolicy', {
          //       policy: 'pauseIfNetworkFetchesPending',
          //       initialVirtualTime: fakeDateTS / 1000,
          //     });
          //   }
          //   // Fallback to older method
          //   else if (browser.driver) {
          //     const session = await browser.driver.getDevToolsSession();
          //     await session.send('Emulation.setVirtualTimePolicy', {
          //       policy: 'pauseIfNetworkFetchesPending',
          //       initialVirtualTime: fakeDateTS / 1000,
          //     });
          //   } else {
          //     throw new Error('Unable to simulate other time');
          //   }
        },
      },
    },
  },
};

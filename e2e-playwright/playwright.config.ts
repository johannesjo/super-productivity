import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: path.join(__dirname, 'tests'),
  /* Global setup */
  globalSetup: require.resolve(path.join(__dirname, 'global-setup')),
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [
        [
          'html',
          {
            outputFolder: path.join(
              __dirname,
              '..',
              '.tmp',
              'e2e-test-results',
              'playwright-report',
            ),
            open: 'never',
          },
        ],
        [
          'junit',
          {
            outputFile: path.join(
              __dirname,
              '..',
              '.tmp',
              'e2e-test-results',
              'results.xml',
            ),
          },
        ],
      ]
    : process.env.PLAYWRIGHT_HTML_REPORT
      ? [
          [
            'html',
            {
              outputFolder: path.join(
                __dirname,
                '..',
                '.tmp',
                'e2e-test-results',
                'playwright-report',
              ),
              open: 'always',
            },
          ],
        ]
      : 'line',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:4242',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',

    /* Browser options */
    userAgent: 'PLAYWRIGHT',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          permissions: ['geolocation', 'notifications'],
          geolocation: { longitude: 0, latitude: 0 },
        },
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--disable-browser-side-navigation'],
        },
      },
    },

    // Optionally test against other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'ng serve --port 4242',
    url: 'http://localhost:4242',
    reuseExistingServer: true,
    timeout: 30 * 1000,
  },

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: path.join(__dirname, '..', '.tmp', 'e2e-test-results', 'test-results'),

  /* Global timeout for each test */
  timeout: 10 * 1000,

  /* Global timeout for each assertion */
  expect: {
    timeout: 5 * 1000,
  },
});

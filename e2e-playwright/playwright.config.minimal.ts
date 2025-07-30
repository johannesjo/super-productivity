import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

/**
 * Minimal config for quick test runs with minimal output
 */
export default defineConfig({
  ...baseConfig,

  // Faster timeout for quicker failures
  timeout: 10 * 1000,

  // Minimal reporter - only show failures
  reporter: [['line']],

  // No retries for faster results
  retries: 0,

  // Disable videos and traces for speed
  use: {
    ...baseConfig.use,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  // Disable parallel execution for cleaner output
  workers: 1,
});

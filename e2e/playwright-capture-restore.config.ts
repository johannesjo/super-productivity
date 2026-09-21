import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

// The spec owns its backend. Global setup would check it before it starts.
export default defineConfig({
  ...baseConfig,
  globalSetup: undefined,
  testMatch: '**/agent-capture-restore.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 240000,
  projects: baseConfig.projects?.filter((project) => project.name === 'chromium'),
});

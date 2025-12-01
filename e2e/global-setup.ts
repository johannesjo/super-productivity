import { FullConfig } from '@playwright/test';

const globalSetup = async (config: FullConfig): Promise<void> => {
  // Set test environment variables
  process.env.TZ = 'Europe/Berlin';
  process.env.NODE_ENV = 'test';
  console.log(`Running tests with ${config.workers} workers`);

  // Any other global setup needed
};

export default globalSetup;

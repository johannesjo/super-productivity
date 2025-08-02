import { FullConfig } from '@playwright/test';

const globalSetup = async (config: FullConfig): Promise<void> => {
  console.log('Running global setup...');

  // Set test environment variables
  process.env.TZ = 'Europe/Berlin';
  process.env.NODE_ENV = 'test';

  // Any other global setup needed
  console.log(`Running tests with ${config.workers} workers`);
};

export default globalSetup;

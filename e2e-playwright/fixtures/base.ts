import { test as base } from '@playwright/test';

// Extend basic test by providing custom fixtures
export const test = base.extend({
  // Custom fixtures will be added here
});

export { expect } from '@playwright/test';

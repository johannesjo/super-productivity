import { expect } from '@playwright/test';

// Custom async assertions
export async function expectNoConsoleErrors(page: any) {
  const errors: string[] = [];

  page.on('console', (msg: any) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Wait a bit to collect any errors
  await page.waitForTimeout(100);

  expect(errors).toHaveLength(0);
}

// Custom matcher for element count
export async function expectElementCount(
  locator: any,
  expectedCount: number,
  options?: { timeout?: number },
) {
  await expect(locator).toHaveCount(expectedCount, options);
}

// Custom assertion for text content
export async function expectTextToContain(
  locator: any,
  text: string,
  options?: { timeout?: number },
) {
  await expect(locator).toContainText(text, options);
}

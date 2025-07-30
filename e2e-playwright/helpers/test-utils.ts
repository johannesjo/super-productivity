import { Page } from '@playwright/test';

export class TestUtils {
  static async waitForAngular(page: Page) {
    // Wait for Angular to be stable
    await page.waitForFunction(() => {
      const win = window as any;
      if (win.getAllAngularTestabilities) {
        const testabilities = win.getAllAngularTestabilities();
        return testabilities.every((testability: any) => testability.isStable());
      }
      return true;
    });
  }

  static async clearLocalStorage(page: Page) {
    await page.evaluate(() => localStorage.clear());
  }

  static async clearIndexedDB(page: Page) {
    await page.evaluate(async () => {
      const databases = await indexedDB.databases();
      await Promise.all(
        databases.map((db) => db.name && indexedDB.deleteDatabase(db.name)),
      );
    });
  }

  static async resetApp(page: Page) {
    await this.clearLocalStorage(page);
    await this.clearIndexedDB(page);
    await page.reload();
  }

  static generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static async takeDebugScreenshot(page: Page, name: string) {
    if (process.env.DEBUG) {
      await page.screenshot({
        path: `e2e-playwright/debug-screenshots/${name}-${Date.now()}.png`,
        fullPage: true,
      });
    }
  }
}

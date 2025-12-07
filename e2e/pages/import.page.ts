import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';
import * as path from 'path';

/**
 * Page object for file import operations.
 * Handles navigation to import settings and file import functionality.
 */
export class ImportPage extends BasePage {
  /** Import from file button */
  readonly importFromFileBtn: Locator;
  /** Hidden file input element */
  readonly fileInput: Locator;
  /** Import from URL button */
  readonly importFromUrlBtn: Locator;
  /** Export backup button */
  readonly exportBackupBtn: Locator;

  constructor(page: Page) {
    super(page);
    // The import button contains text "Import from file" and has file_download icon
    this.importFromFileBtn = page.locator(
      'file-imex button:has(mat-icon:has-text("file_download"))',
    );
    this.fileInput = page.locator('file-imex input[type="file"]');
    this.importFromUrlBtn = page.locator(
      'file-imex button:has(mat-icon:has-text("cloud_download"))',
    );
    this.exportBackupBtn = page.locator(
      'file-imex button:has(mat-icon:has-text("file_upload"))',
    );
  }

  /**
   * Navigate to the import/export settings page.
   */
  async navigateToImportPage(): Promise<void> {
    await this.page.goto('/#/settings/sync');
    await this.page.waitForLoadState('networkidle');
    // Scroll down to find the file-imex component
    await this.page.evaluate(() => {
      const fileImex = document.querySelector('file-imex');
      if (fileImex) {
        fileImex.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    });
    await this.importFromFileBtn.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Import a backup file using the file input.
   * This triggers the native file dialog via Playwright's setInputFiles.
   *
   * @param filePath - Absolute path to the backup JSON file
   */
  async importBackupFile(filePath: string): Promise<void> {
    // Set the file on the hidden input element
    await this.fileInput.setInputFiles(filePath);

    // Wait for import to be processed
    // The app navigates to TODAY tag after successful import
    await this.page.waitForURL(/tag\/TODAY/, { timeout: 15000 });
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500);
  }

  /**
   * Get the path to a test fixture file.
   *
   * @param filename - Name of the fixture file in e2e/fixtures/
   * @returns Absolute path to the fixture file
   */
  static getFixturePath(filename: string): string {
    return path.resolve(__dirname, '..', 'fixtures', filename);
  }
}

import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';

export interface SuperSyncConfig {
  baseUrl: string;
  accessToken: string;
}

/**
 * Page object for SuperSync configuration and sync operations.
 * Used for E2E tests that verify multi-client sync via the super-sync-server.
 */
export class SuperSyncPage extends BasePage {
  readonly syncBtn: Locator;
  readonly providerSelect: Locator;
  readonly baseUrlInput: Locator;
  readonly accessTokenInput: Locator;
  readonly saveBtn: Locator;
  readonly syncSpinner: Locator;
  readonly syncCheckIcon: Locator;
  readonly syncErrorIcon: Locator;

  constructor(page: Page) {
    super(page);
    this.syncBtn = page.locator('button.sync-btn');
    this.providerSelect = page.locator('formly-field-mat-select mat-select');
    this.baseUrlInput = page.locator('.e2e-baseUrl input');
    this.accessTokenInput = page.locator('.e2e-accessToken textarea');
    this.saveBtn = page.locator('mat-dialog-actions button[mat-stroked-button]');
    this.syncSpinner = page.locator('.sync-btn mat-icon.spin');
    this.syncCheckIcon = page.locator('.sync-btn mat-icon.sync-state-ico');
    this.syncErrorIcon = page.locator('.sync-btn mat-icon.error');
  }

  /**
   * Configure SuperSync with server URL and access token.
   */
  async setupSuperSync(config: SuperSyncConfig): Promise<void> {
    await this.syncBtn.click();
    await this.providerSelect.waitFor({ state: 'visible' });
    await this.providerSelect.click();

    // Select SuperSync option
    const superSyncOption = this.page
      .locator('mat-option')
      .filter({ hasText: 'SuperSync' });
    await superSyncOption.waitFor({ state: 'visible' });
    await superSyncOption.click();

    // Fill configuration
    await this.baseUrlInput.waitFor({ state: 'visible' });
    await this.baseUrlInput.fill(config.baseUrl);
    await this.accessTokenInput.fill(config.accessToken);

    // Save
    await this.saveBtn.click();
  }

  /**
   * Trigger a sync operation by clicking the sync button.
   */
  async triggerSync(): Promise<void> {
    await this.syncBtn.click();
    // Wait for sync to start or complete immediately
    await Promise.race([
      this.syncSpinner.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {}),
      this.syncCheckIcon.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {}),
    ]);
  }

  /**
   * Wait for sync to complete (spinner gone, check icon visible).
   */
  async waitForSyncComplete(timeout = 30000): Promise<void> {
    await this.syncSpinner.waitFor({ state: 'hidden', timeout });
    await this.syncCheckIcon.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Check if sync resulted in an error.
   */
  async hasSyncError(): Promise<boolean> {
    return this.syncErrorIcon.isVisible();
  }

  /**
   * Perform a full sync and wait for completion.
   */
  async syncAndWait(): Promise<void> {
    await this.triggerSync();
    await this.waitForSyncComplete();
  }
}

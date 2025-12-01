import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class SyncPage extends BasePage {
  readonly syncBtn: Locator;
  readonly providerSelect: Locator;
  readonly baseUrlInput: Locator;
  readonly userNameInput: Locator;
  readonly passwordInput: Locator;
  readonly syncFolderInput: Locator;
  readonly saveBtn: Locator;
  readonly syncSpinner: Locator;
  readonly syncCheckIcon: Locator;

  constructor(page: Page) {
    super(page);
    this.syncBtn = page.locator('button.sync-btn');
    this.providerSelect = page.locator('formly-field-mat-select mat-select');
    this.baseUrlInput = page.locator('.e2e-baseUrl input');
    this.userNameInput = page.locator('.e2e-userName input');
    this.passwordInput = page.locator('.e2e-password input');
    this.syncFolderInput = page.locator('.e2e-syncFolderPath input');
    this.saveBtn = page.locator('mat-dialog-actions button[mat-stroked-button]');
    this.syncSpinner = page.locator('.sync-btn mat-icon.spin');
    this.syncCheckIcon = page.locator('.sync-btn mat-icon.sync-state-ico');
  }

  async setupWebdavSync(config: {
    baseUrl: string;
    username: string;
    password: string;
    syncFolderPath: string;
  }): Promise<void> {
    await this.syncBtn.click();
    await this.providerSelect.waitFor({ state: 'visible' });

    // Click on provider select to open dropdown
    await this.providerSelect.click();

    // Select WebDAV option - using more robust selector
    const webdavOption = this.page.locator('mat-option').filter({ hasText: 'WebDAV' });
    await webdavOption.waitFor({ state: 'visible' });
    await webdavOption.click();

    // Wait for form fields to be visible before filling
    await this.baseUrlInput.waitFor({ state: 'visible' });

    // Fill in the configuration
    await this.baseUrlInput.fill(config.baseUrl);
    await this.userNameInput.fill(config.username);
    await this.passwordInput.fill(config.password);
    await this.syncFolderInput.fill(config.syncFolderPath);

    // Save the configuration
    await this.saveBtn.click();
  }

  async triggerSync(): Promise<void> {
    await this.syncBtn.click();
    // Wait for any sync operation to start (spinner appears or completes immediately)
    await Promise.race([
      this.syncSpinner.waitFor({ state: 'visible', timeout: 1000 }).catch(() => {}),
      this.syncCheckIcon.waitFor({ state: 'visible', timeout: 1000 }).catch(() => {}),
    ]);
  }

  async waitForSyncComplete(): Promise<void> {
    // Wait for sync spinner to disappear
    await this.syncSpinner.waitFor({ state: 'hidden', timeout: 20000 }); // Reduced from 30s to 20s
    // Verify check icon appears
    await this.syncCheckIcon.waitFor({ state: 'visible' });
  }
}

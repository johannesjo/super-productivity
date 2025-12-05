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
  /** Fresh client confirmation dialog - appears when a new client first syncs */
  readonly freshClientDialog: Locator;
  readonly freshClientConfirmBtn: Locator;
  /** Conflict resolution dialog - appears when local and remote have conflicting changes */
  readonly conflictDialog: Locator;
  readonly conflictUseRemoteBtn: Locator;
  readonly conflictApplyBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.syncBtn = page.locator('button.sync-btn');
    this.providerSelect = page.locator('formly-field-mat-select mat-select');
    this.baseUrlInput = page.locator('.e2e-baseUrl input');
    this.accessTokenInput = page.locator('.e2e-accessToken textarea');
    this.saveBtn = page.locator('mat-dialog-actions button[mat-stroked-button]');
    this.syncSpinner = page.locator('.sync-btn mat-icon.spin');
    this.syncCheckIcon = page.locator('.sync-btn mat-icon.sync-state-ico');
    // Error state shows sync_problem icon (no special class, just the icon name)
    this.syncErrorIcon = page.locator('.sync-btn mat-icon:has-text("sync_problem")');
    // Fresh client confirmation dialog elements
    this.freshClientDialog = page.locator('dialog-confirm');
    this.freshClientConfirmBtn = page.locator('dialog-confirm button[mat-flat-button]');
    // Conflict resolution dialog elements
    this.conflictDialog = page.locator('dialog-conflict-resolution');
    this.conflictUseRemoteBtn = page.locator(
      'dialog-conflict-resolution button:has-text("Use All Remote")',
    );
    this.conflictApplyBtn = page.locator(
      'dialog-conflict-resolution button:has-text("G.APPLY")',
    );
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
   * Automatically handles sync dialogs:
   * - Fresh client confirmation dialog
   * - Conflict resolution dialog (uses remote by default)
   */
  async waitForSyncComplete(timeout = 30000): Promise<void> {
    const startTime = Date.now();

    // Poll for completion while handling dialogs
    while (Date.now() - startTime < timeout) {
      // Check if fresh client confirmation dialog appeared
      if (await this.freshClientDialog.isVisible()) {
        console.log('[SuperSyncPage] Fresh client dialog detected, confirming...');
        await this.freshClientConfirmBtn.click();
        await this.page.waitForTimeout(500);
        continue;
      }

      // Check if conflict resolution dialog appeared
      if (await this.conflictDialog.isVisible()) {
        console.log('[SuperSyncPage] Conflict dialog detected, using remote...');
        await this.conflictUseRemoteBtn.click();
        // Wait for selection to be applied
        await this.page.waitForTimeout(300);
        // Click G.APPLY to confirm the resolution
        if (await this.conflictApplyBtn.isEnabled()) {
          console.log('[SuperSyncPage] Clicking G.APPLY to apply resolution...');
          await this.conflictApplyBtn.click();
        }
        // Wait for dialog to close and sync to continue
        await this.page.waitForTimeout(1000);
        continue;
      }

      // Check if sync is complete
      const isSpinning = await this.syncSpinner.isVisible();
      if (!isSpinning) {
        // Check for error state first
        const hasError = await this.syncErrorIcon.isVisible();
        if (hasError) {
          // Check for error snackbar
          const errorSnackbar = this.page.locator(
            'simple-snack-bar, .mat-mdc-snack-bar-container',
          );
          const snackbarText = await errorSnackbar
            .textContent()
            .catch(() => 'Unknown error');
          throw new Error(`Sync failed: ${snackbarText?.trim() || 'Server error'}`);
        }

        // Sync finished successfully - verify with check icon
        const checkVisible = await this.syncCheckIcon.isVisible();
        if (checkVisible) {
          return;
        }

        // Neither error nor success - wait a bit more
        await this.page.waitForTimeout(500);
        continue;
      }

      // Wait before checking again
      await this.page.waitForTimeout(200);
    }

    throw new Error(`Sync did not complete within ${timeout}ms`);
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

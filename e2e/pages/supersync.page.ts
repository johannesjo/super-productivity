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

    // Check if sync starts automatically (it should if enabled)
    try {
      await this.syncSpinner.waitFor({ state: 'visible', timeout: 5000 });
      console.log(
        '[SuperSyncPage] Initial sync started automatically, waiting for completion...',
      );
      await this.waitForSyncComplete();
    } catch (e) {
      // No auto-sync, that's fine
    }
  }

  /**
   * Trigger a sync operation by clicking the sync button.
   */
  async triggerSync(): Promise<void> {
    // Wait a bit to ensure any previous internal state is cleared
    await this.page.waitForTimeout(1000);

    // Check if sync is already running to avoid "Sync already in progress" errors
    // If it is, wait for it to finish so we can trigger a fresh sync that includes our latest changes
    if (await this.syncSpinner.isVisible()) {
      console.log(
        '[SuperSyncPage] Sync already in progress, waiting for it to finish...',
      );
      await this.syncSpinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {
        console.log(
          '[SuperSyncPage] Warning: Timed out waiting for previous sync to finish',
        );
      });
      // Add a small buffer after spinner disappears
      await this.page.waitForTimeout(500);
    }

    // Use force:true to bypass any tooltip overlays that might be in the way
    await this.syncBtn.click({ force: true });
    // Wait for sync to start or complete immediately
    await Promise.race([
      this.syncSpinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      this.syncCheckIcon.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
    ]);
  }

  /**
   * Wait for sync to complete (spinner gone, no error).
   * Automatically handles sync dialogs:
   * - Fresh client confirmation dialog
   * - Conflict resolution dialog (uses remote by default)
   */
  async waitForSyncComplete(timeout = 30000): Promise<void> {
    const startTime = Date.now();
    let stableCount = 0; // Count consecutive checks where sync appears complete

    // Poll for completion while handling dialogs
    while (Date.now() - startTime < timeout) {
      // Check if fresh client confirmation dialog appeared
      if (await this.freshClientDialog.isVisible()) {
        console.log('[SuperSyncPage] Fresh client dialog detected, confirming...');
        await this.freshClientConfirmBtn.click();
        await this.page.waitForTimeout(500);
        stableCount = 0;
        continue;
      }

      // Check if conflict resolution dialog appeared
      if (await this.conflictDialog.isVisible()) {
        console.log('[SuperSyncPage] Conflict dialog detected, using remote...');
        await this.conflictUseRemoteBtn.click();
        // Wait for selection to be applied and G.APPLY to be enabled
        await this.page.waitForTimeout(500);

        // Wait for G.APPLY button to be enabled (with retry)
        // Increase retries to allow for processing time (50 * 200ms = 10s)
        for (let i = 0; i < 50; i++) {
          // If dialog closed unexpectedly, break loop
          if (!(await this.conflictDialog.isVisible())) {
            break;
          }

          // Check if enabled with short timeout to avoid long waits if element missing
          const isEnabled = await this.conflictApplyBtn
            .isEnabled({ timeout: 1000 })
            .catch(() => false);

          if (isEnabled) {
            console.log('[SuperSyncPage] Clicking G.APPLY to apply resolution...');
            await this.conflictApplyBtn.click();
            break;
          }
          await this.page.waitForTimeout(200);
        }

        // Wait for dialog to close
        await this.conflictDialog
          .waitFor({ state: 'hidden', timeout: 5000 })
          .catch(() => {});
        await this.page.waitForTimeout(500);
        stableCount = 0;
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

        // Sync finished - check icon may appear briefly or not at all
        const checkVisible = await this.syncCheckIcon.isVisible();
        if (checkVisible) {
          return; // Sync complete with check icon
        }

        // No spinner, no error - sync likely complete
        // Wait for stable state (3 consecutive checks) to confirm
        stableCount++;
        if (stableCount >= 3) {
          console.log('[SuperSyncPage] Sync complete (no spinner, no error)');
          return;
        }

        await this.page.waitForTimeout(300);
        continue;
      }

      // Still spinning - reset stable count
      stableCount = 0;
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
   * Includes a settling delay to let UI update after sync.
   */
  async syncAndWait(): Promise<void> {
    await this.triggerSync();
    await this.waitForSyncComplete();
    // Allow UI to settle after sync - reduces flakiness
    await this.page.waitForTimeout(300);
  }
}

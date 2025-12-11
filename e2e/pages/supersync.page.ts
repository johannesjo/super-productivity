import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export interface SuperSyncConfig {
  baseUrl: string;
  accessToken: string;
  isEncryptionEnabled?: boolean;
  password?: string;
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
  readonly encryptionCheckbox: Locator;
  readonly encryptionPasswordInput: Locator;
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
    this.encryptionCheckbox = page.locator(
      '.e2e-isEncryptionEnabled input[type="checkbox"]',
    );
    this.encryptionPasswordInput = page.locator('.e2e-encryptKey input[type="password"]');
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
      'dialog-conflict-resolution button:has-text("Apply")',
    );
  }

  /**
   * Configure SuperSync with server URL and access token.
   * Uses right-click to open settings dialog (works even when sync is already configured).
   */
  async setupSuperSync(config: SuperSyncConfig): Promise<void> {
    // Use right-click to always open sync settings dialog
    // (left-click triggers sync if already configured)
    await this.syncBtn.click({ button: 'right' });
    await this.providerSelect.waitFor({ state: 'visible' });

    // Retry loop for opening the dropdown
    let dropdownOpen = false;
    const superSyncOption = this.page
      .locator('mat-option')
      .filter({ hasText: 'SuperSync' });

    for (let i = 0; i < 3; i++) {
      try {
        await this.providerSelect.click();
        // Wait briefly for animation
        await this.page.waitForTimeout(500);

        if (await superSyncOption.isVisible()) {
          dropdownOpen = true;
          break;
        } else {
          console.log(`[SuperSyncPage] Dropdown not open attempt ${i + 1}, retrying...`);
          // If not visible, maybe we need to click again or close/open
          // Click body to close if it was partially open/confused
          await this.page.locator('body').click({ force: true });
          await this.page.waitForTimeout(200);
        }
      } catch (e) {
        console.log(`[SuperSyncPage] Error opening dropdown attempt ${i + 1}: ${e}`);
      }
    }

    if (!dropdownOpen) {
      // Last ditch effort - try one more simple click
      await this.providerSelect.click();
    }

    await superSyncOption.waitFor({ state: 'visible' });
    await superSyncOption.click();

    // Wait for the dropdown overlay to close
    await this.page.locator('.mat-mdc-select-panel').waitFor({ state: 'detached' });

    // Fill configuration
    await this.baseUrlInput.waitFor({ state: 'visible' });
    await this.baseUrlInput.fill(config.baseUrl);
    await this.accessTokenInput.fill(config.accessToken);

    // Handle Encryption
    if (config.isEncryptionEnabled) {
      // Check if already checked (mat-checkbox structure)
      // We check the native input checked state
      const isChecked = await this.encryptionCheckbox.isChecked();
      if (!isChecked) {
        // Click the custom checkbox touch target, force true to bypass internal input interception
        await this.page
          .locator('.e2e-isEncryptionEnabled .mat-mdc-checkbox-touch-target')
          .click({ force: true });

        // Verify it got checked
        await expect(this.encryptionCheckbox).toBeChecked({ timeout: 2000 });
      }

      if (config.password) {
        await this.encryptionPasswordInput.waitFor({ state: 'visible' });
        await this.encryptionPasswordInput.fill(config.password);
        await this.encryptionPasswordInput.blur();
      }
    } else {
      // Ensure it is unchecked if config says disabled
      const isChecked = await this.encryptionCheckbox.isChecked();
      if (isChecked) {
        await this.page
          .locator('.e2e-isEncryptionEnabled .mat-mdc-checkbox-touch-target')
          .click({ force: true });
        await expect(this.encryptionCheckbox).not.toBeChecked({ timeout: 2000 });
      }
    }

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
        // Wait for selection to be applied and Apply to be enabled
        await this.page.waitForTimeout(500);

        // Wait for Apply button to be enabled (with retry)
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
            console.log('[SuperSyncPage] Clicking Apply to apply resolution...');
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

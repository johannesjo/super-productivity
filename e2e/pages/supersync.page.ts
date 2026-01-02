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
    this.freshClientConfirmBtn = page.locator(
      'dialog-confirm button[mat-stroked-button]',
    );
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
    // Wait for sync button to be ready first
    // The sync button depends on globalConfig being loaded (isSyncIconEnabled),
    // which can take time after initial app load. Use longer timeout and retry.
    const syncBtnTimeout = 30000;
    try {
      await this.syncBtn.waitFor({ state: 'visible', timeout: syncBtnTimeout });
    } catch {
      // If sync button not visible, the app might not be fully loaded
      // Wait a bit more and try once more
      console.log('[SuperSyncPage] Sync button not found initially, waiting longer...');
      await this.page.waitForTimeout(2000);
      await this.syncBtn.waitFor({ state: 'visible', timeout: syncBtnTimeout });
    }

    // Retry loop for opening the sync settings dialog via right-click
    // Sometimes the right-click doesn't register, especially under load
    let dialogOpened = false;
    for (let dialogAttempt = 0; dialogAttempt < 5; dialogAttempt++) {
      if (this.page.isClosed()) {
        throw new Error('Page was closed during SuperSync setup');
      }

      console.log(
        `[SuperSyncPage] Opening sync settings dialog (attempt ${dialogAttempt + 1})...`,
      );

      // Use right-click to always open sync settings dialog
      // (left-click triggers sync if already configured)
      await this.syncBtn.click({ button: 'right' });

      try {
        // Wait for dialog to be fully loaded - use shorter timeout to retry faster
        await this.providerSelect.waitFor({ state: 'visible', timeout: 5000 });
        dialogOpened = true;
        console.log('[SuperSyncPage] Sync settings dialog opened successfully');
        break;
      } catch {
        console.log(
          `[SuperSyncPage] Dialog not opened on attempt ${dialogAttempt + 1}, retrying...`,
        );
        // Dismiss any partial state
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
      }
    }

    if (!dialogOpened) {
      // Last attempt with longer timeout
      console.log('[SuperSyncPage] Final attempt to open sync settings dialog...');
      await this.syncBtn.click({ button: 'right', force: true });
      await this.providerSelect.waitFor({ state: 'visible', timeout: 10000 });
    }

    // Additional wait for the element to be stable/interactive
    await this.page.waitForTimeout(300);

    // Retry loop for opening the dropdown
    let dropdownOpen = false;
    const superSyncOption = this.page
      .locator('mat-option')
      .filter({ hasText: 'SuperSync' });

    for (let i = 0; i < 5; i++) {
      // Check if page is still open before each attempt
      if (this.page.isClosed()) {
        throw new Error('Page was closed during SuperSync setup');
      }

      try {
        // Use shorter timeout for click to fail fast and retry
        await this.providerSelect.click({ timeout: 5000 });
        // Wait for dropdown animation
        await this.page.waitForTimeout(500);

        if (await superSyncOption.isVisible()) {
          dropdownOpen = true;
          break;
        } else {
          console.log(`[SuperSyncPage] Dropdown not open attempt ${i + 1}, retrying...`);
          // If not visible, close any partial dropdown and wait before retry
          if (!this.page.isClosed()) {
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(300);
          }
        }
      } catch (e) {
        // Check if page is closed before trying to recover
        if (this.page.isClosed()) {
          throw new Error('Page was closed during SuperSync setup');
        }
        console.log(`[SuperSyncPage] Error opening dropdown attempt ${i + 1}: ${e}`);
        // On click timeout, try to dismiss any blocking overlays
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
      }
    }

    if (!dropdownOpen) {
      // Check if page is still open
      if (this.page.isClosed()) {
        throw new Error('Page was closed during SuperSync setup');
      }
      // Last ditch effort - force click
      console.log('[SuperSyncPage] Last attempt - force clicking provider select');
      await this.providerSelect.click({ force: true, timeout: 10000 });
      await this.page.waitForTimeout(500);
    }

    await superSyncOption.waitFor({ state: 'visible', timeout: 10000 });
    await superSyncOption.click();

    // Wait for the dropdown overlay to close
    await this.page.locator('.mat-mdc-select-panel').waitFor({ state: 'detached' });

    // Fill Access Token first (it's outside the collapsible)
    await this.accessTokenInput.waitFor({ state: 'visible' });
    await this.accessTokenInput.fill(config.accessToken);

    // Expand "Advanced settings" collapsible to access baseUrl and encryption fields
    // Use text-based locator to find the correct collapsible (there may be others on the page)
    const advancedCollapsible = this.page.locator(
      '.collapsible-header:has-text("Advanced")',
    );
    await advancedCollapsible.waitFor({ state: 'visible', timeout: 5000 });
    await advancedCollapsible.click();
    // Wait for baseUrl input to be visible (confirms collapsible is expanded)
    await this.baseUrlInput.waitFor({ state: 'visible', timeout: 3000 });

    // Now fill baseUrl (inside the collapsible)
    await this.baseUrlInput.waitFor({ state: 'visible' });
    await this.baseUrlInput.fill(config.baseUrl);

    // Handle Encryption (also inside the collapsible)
    // Angular Material checkboxes can start in an indeterminate "mixed" state before the form loads.
    // Use the label click with retry logic to reliably toggle the checkbox state.
    const checkboxLabel = this.page.locator('.e2e-isEncryptionEnabled label');

    if (config.isEncryptionEnabled) {
      // Use toPass() to retry until checkbox is checked - handles initial indeterminate state
      await expect(async () => {
        const isChecked = await this.encryptionCheckbox.isChecked();
        if (!isChecked) {
          await checkboxLabel.click();
        }
        await expect(this.encryptionCheckbox).toBeChecked({ timeout: 1000 });
      }).toPass({ timeout: 10000, intervals: [500, 1000, 1500] });

      if (config.password) {
        await this.encryptionPasswordInput.waitFor({ state: 'visible' });
        await this.encryptionPasswordInput.fill(config.password);
        await this.encryptionPasswordInput.blur();
      }
    } else {
      // Use toPass() to retry until checkbox is unchecked
      await expect(async () => {
        const isChecked = await this.encryptionCheckbox.isChecked();
        if (isChecked) {
          await checkboxLabel.click();
        }
        await expect(this.encryptionCheckbox).not.toBeChecked({ timeout: 1000 });
      }).toPass({ timeout: 10000, intervals: [500, 1000, 1500] });
    }

    // Save - use a robust click that handles element detachment during dialog close
    // The dialog may close and navigation may start before click completes
    try {
      // Wait for button to be stable before clicking
      await this.saveBtn.waitFor({ state: 'visible', timeout: 5000 });
      await this.page.waitForTimeout(100); // Brief settle

      // Click and don't wait for navigation to complete - just initiate the action
      await Promise.race([
        this.saveBtn.click({ timeout: 5000 }),
        // If dialog closes quickly, the click may fail - that's OK if dialog is gone
        this.page
          .locator('mat-dialog-container')
          .waitFor({ state: 'detached', timeout: 5000 }),
      ]);
    } catch (e) {
      // If click failed but dialog is already closed, that's fine
      const dialogStillOpen = await this.page
        .locator('mat-dialog-container')
        .isVisible()
        .catch(() => false);
      if (dialogStillOpen) {
        // Dialog still open - the click actually failed
        throw e;
      }
      // Dialog closed - click worked or was unnecessary
      console.log('[SuperSyncPage] Dialog closed (click may have been interrupted)');
    }

    // Wait for dialog to fully close
    await this.page
      .locator('mat-dialog-container')
      .waitFor({ state: 'detached', timeout: 5000 })
      .catch(() => {});

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
      // Check if page is still open
      if (this.page.isClosed()) {
        throw new Error('Page was closed while waiting for sync to complete');
      }

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
          // Check for error snackbar - only treat as error if it contains actual error keywords
          const errorSnackbar = this.page.locator(
            'simple-snack-bar, .mat-mdc-snack-bar-container',
          );
          const snackbarText = await errorSnackbar.textContent().catch(() => '');
          const snackbarLower = (snackbarText || '').toLowerCase();

          // Only throw if this looks like a real sync error, not an informational message
          // Informational messages include: "Deleted task X Undo", "addCreated task X", etc.
          // Rate limit errors (429) are transient - the app retries automatically
          const isRateLimitError =
            snackbarLower.includes('rate limit') ||
            snackbarLower.includes('429') ||
            snackbarLower.includes('retry in');

          const isRealError =
            (snackbarLower.includes('error') ||
              snackbarLower.includes('failed') ||
              snackbarLower.includes('problem') ||
              snackbarLower.includes('could not') ||
              snackbarLower.includes('unable to')) &&
            !isRateLimitError;

          if (isRealError) {
            throw new Error(`Sync failed: ${snackbarText?.trim() || 'Server error'}`);
          }

          // If rate limited, wait for the retry (app handles this automatically)
          if (isRateLimitError) {
            console.log('[SuperSyncPage] Rate limited, waiting for automatic retry...');
            stableCount = 0;
            await this.page.waitForTimeout(1000);
            continue;
          }
          // Not a real error, just an informational snackbar - continue checking
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

  /**
   * Open the sync settings dialog and change the encryption password.
   * This will delete all server data and re-upload with the new password.
   *
   * @param newPassword - The new encryption password
   */
  async changeEncryptionPassword(newPassword: string): Promise<void> {
    // Open sync settings via right-click
    await this.syncBtn.click({ button: 'right' });
    await this.providerSelect.waitFor({ state: 'visible', timeout: 10000 });

    // Scroll down to find the change password button
    const dialogContent = this.page.locator('mat-dialog-content');
    await dialogContent.evaluate((el) => el.scrollTo(0, el.scrollHeight));

    // Click the "Change Encryption Password" button
    const changePasswordBtn = this.page.locator(
      'button:has-text("Change Encryption Password")',
    );
    await changePasswordBtn.waitFor({ state: 'visible', timeout: 5000 });
    await changePasswordBtn.click();

    // Wait for the change password dialog to appear
    const changePasswordDialog = this.page.locator('dialog-change-encryption-password');
    await changePasswordDialog.waitFor({ state: 'visible', timeout: 5000 });

    // Fill in the new password
    const newPasswordInput = changePasswordDialog.locator('input[name="newPassword"]');
    const confirmPasswordInput = changePasswordDialog.locator(
      'input[name="confirmPassword"]',
    );

    await newPasswordInput.fill(newPassword);
    await confirmPasswordInput.fill(newPassword);

    // Click the confirm button
    const confirmBtn = changePasswordDialog.locator('button[color="warn"]');
    await confirmBtn.click();

    // Wait for the dialog to close (password change complete)
    await changePasswordDialog.waitFor({ state: 'detached', timeout: 60000 });

    // Check for snackbar - if visible, verify it's not an error
    // The snackbar may auto-dismiss quickly, so we use a short timeout
    const snackbar = this.page.locator('simple-snack-bar');
    try {
      await snackbar.waitFor({ state: 'visible', timeout: 3000 });
      const snackbarText = (await snackbar.textContent()) || '';
      const lowerText = snackbarText.toLowerCase();

      // Check for error indicators
      if (
        lowerText.includes('error') ||
        lowerText.includes('failed') ||
        lowerText.includes('critical')
      ) {
        throw new Error(`Password change failed: ${snackbarText}`);
      }
      // Success - snackbar appeared and wasn't an error
    } catch (e) {
      // Snackbar not visible or already dismissed - that's OK
      // The dialog closing successfully is the primary indicator of success
      if (e instanceof Error && e.message.includes('Password change failed')) {
        throw e; // Re-throw actual error snackbars
      }
      // Otherwise ignore - dialog closed = success
    }

    // Small wait for UI to settle
    await this.page.waitForTimeout(500);

    // Close the sync settings dialog if still open
    const dialogContainer = this.page.locator('mat-dialog-container');
    if (await dialogContainer.isVisible()) {
      await this.page.keyboard.press('Escape');
      await dialogContainer.waitFor({ state: 'detached', timeout: 5000 });
    }
  }
}

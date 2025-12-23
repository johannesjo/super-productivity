import { inject, Injectable } from '@angular/core';
import { PfapiService } from '../../pfapi/pfapi.service';
import { PfapiStoreDelegateService } from '../../pfapi/pfapi-store-delegate.service';
import { OperationEncryptionService } from '../../core/persistence/operation-log/sync/operation-encryption.service';
import { VectorClockService } from '../../core/persistence/operation-log/sync/vector-clock.service';
import {
  CLIENT_ID_PROVIDER,
  ClientIdProvider,
} from '../../core/persistence/operation-log/client-id.provider';
import { isOperationSyncCapable } from '../../core/persistence/operation-log/sync/operation-sync.util';
import { SyncProviderId } from '../../pfapi/api/pfapi.const';
import { SuperSyncPrivateCfg } from '../../pfapi/api/sync/providers/super-sync/super-sync.model';
import { CURRENT_SCHEMA_VERSION } from '../../core/persistence/operation-log/store/schema-migration.service';
import { SyncLog } from '../../core/log';

/**
 * Service for changing the encryption password for SuperSync.
 *
 * Password change flow:
 * 1. Delete all data on server
 * 2. Upload current state as snapshot with new password
 * 3. Update local config with new password
 */
@Injectable({
  providedIn: 'root',
})
export class EncryptionPasswordChangeService {
  private _pfapiService = inject(PfapiService);
  private _storeDelegateService = inject(PfapiStoreDelegateService);
  private _encryptionService = inject(OperationEncryptionService);
  private _vectorClockService = inject(VectorClockService);
  private _clientIdProvider: ClientIdProvider = inject(CLIENT_ID_PROVIDER);

  /**
   * Changes the encryption password by deleting all server data
   * and uploading a new encrypted snapshot.
   *
   * Recovery flow:
   * - If snapshot upload fails after server deletion, attempts to restore
   *   using the OLD password so user doesn't lose their server data.
   *
   * @param newPassword - The new encryption password
   * @throws Error if sync provider is not SuperSync or not ready
   */
  async changePassword(newPassword: string): Promise<void> {
    SyncLog.normal('EncryptionPasswordChangeService: Starting password change...');

    // Get the sync provider
    const syncProvider = this._pfapiService.pf.getActiveSyncProvider();
    if (!syncProvider || syncProvider.id !== SyncProviderId.SuperSync) {
      throw new Error('Password change is only supported for SuperSync');
    }

    if (!isOperationSyncCapable(syncProvider)) {
      throw new Error('Sync provider does not support operation sync');
    }

    // Get current config (save old password for recovery)
    const existingCfg =
      (await syncProvider.privateCfg.load()) as SuperSyncPrivateCfg | null;
    const oldPassword = existingCfg?.encryptKey;

    // Get current state
    SyncLog.normal('EncryptionPasswordChangeService: Getting current state...');
    const currentState = await this._storeDelegateService.getAllSyncModelDataFromStore();
    const vectorClock = await this._vectorClockService.getCurrentVectorClock();
    const clientId = await this._clientIdProvider.loadClientId();
    if (!clientId) {
      throw new Error('Client ID not available');
    }

    // Delete all server data
    SyncLog.normal('EncryptionPasswordChangeService: Deleting server data...');
    await syncProvider.deleteAllData();

    // Encrypt and upload new snapshot
    SyncLog.normal(
      'EncryptionPasswordChangeService: Encrypting and uploading snapshot...',
    );
    try {
      const encryptedState = await this._encryptionService.encryptPayload(
        currentState,
        newPassword,
      );

      const response = await syncProvider.uploadSnapshot(
        encryptedState,
        clientId,
        'recovery',
        vectorClock,
        CURRENT_SCHEMA_VERSION,
        true, // isPayloadEncrypted
      );

      if (!response.accepted) {
        throw new Error(`Snapshot upload failed: ${response.error}`);
      }

      // Update local config with new password
      SyncLog.normal('EncryptionPasswordChangeService: Updating local config...');
      await syncProvider.setPrivateCfg({
        ...existingCfg,
        encryptKey: newPassword,
        isEncryptionEnabled: true,
      } as SuperSyncPrivateCfg);

      // Update lastServerSeq to the new snapshot's seq
      if (response.serverSeq !== undefined) {
        await syncProvider.setLastServerSeq(response.serverSeq);
      } else {
        // serverSeq should always be present when accepted=true
        // If missing, sync state may be inconsistent
        SyncLog.err(
          'EncryptionPasswordChangeService: Snapshot accepted but serverSeq is missing. ' +
            'Sync state may be inconsistent - consider using "Sync Now" to verify.',
        );
      }

      SyncLog.normal('EncryptionPasswordChangeService: Password change complete!');
    } catch (uploadError) {
      // CRITICAL: Server data was deleted but new snapshot failed to upload.
      // Attempt recovery by re-uploading with the old password.
      SyncLog.err(
        'EncryptionPasswordChangeService: Snapshot upload failed, attempting recovery...',
        uploadError,
      );

      if (oldPassword) {
        try {
          const recoveryState = await this._encryptionService.encryptPayload(
            currentState,
            oldPassword,
          );

          const recoveryResponse = await syncProvider.uploadSnapshot(
            recoveryState,
            clientId,
            'recovery',
            vectorClock,
            CURRENT_SCHEMA_VERSION,
            true,
          );

          if (recoveryResponse.accepted) {
            if (recoveryResponse.serverSeq !== undefined) {
              await syncProvider.setLastServerSeq(recoveryResponse.serverSeq);
            } else {
              // serverSeq should always be present when accepted=true
              // If missing, sync state may be inconsistent
              SyncLog.err(
                'EncryptionPasswordChangeService: Recovery succeeded but serverSeq is missing. ' +
                  'Sync state may be inconsistent - consider using "Sync Now" to re-sync.',
              );
            }
            SyncLog.warn(
              'EncryptionPasswordChangeService: Restored server data with old password.',
            );
            // Throw outside try/catch so caller knows recovery succeeded but password change failed
            throw new Error(
              'Password change failed. Server data has been restored with your old password. ' +
                'Please try again or check your network connection.',
            );
          }
          // Recovery upload was not accepted - fall through to CRITICAL error
        } catch (recoveryError) {
          // Only log if this is a genuine recovery failure, not our success throw
          const isRecoverySuccessError =
            recoveryError instanceof Error &&
            recoveryError.message.includes('Server data has been restored');
          if (isRecoverySuccessError) {
            // Re-throw the success message to caller
            throw recoveryError;
          }
          SyncLog.err(
            'EncryptionPasswordChangeService: Recovery also failed!',
            recoveryError,
          );
        }
      }

      // Recovery failed or no old password available
      throw new Error(
        'CRITICAL: Password change failed and could not restore server data. ' +
          'Your local data is safe. Please use "Sync Now" to re-upload your data. ' +
          `Original error: ${uploadError instanceof Error ? uploadError.message : uploadError}`,
      );
    }
  }
}

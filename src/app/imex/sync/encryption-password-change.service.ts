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
    const existingCfg =
      (await syncProvider.privateCfg.load()) as SuperSyncPrivateCfg | null;
    await syncProvider.setPrivateCfg({
      ...existingCfg,
      encryptKey: newPassword,
      isEncryptionEnabled: true,
    } as SuperSyncPrivateCfg);

    // Update lastServerSeq to the new snapshot's seq
    if (response.serverSeq !== undefined) {
      await syncProvider.setLastServerSeq(response.serverSeq);
    }

    SyncLog.normal('EncryptionPasswordChangeService: Password change complete!');
  }
}

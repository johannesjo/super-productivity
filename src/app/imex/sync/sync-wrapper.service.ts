import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, firstValueFrom, Observable, of } from 'rxjs';
import { GlobalConfigService } from '../../features/config/global-config.service';
import {
  distinctUntilChanged,
  filter,
  first,
  map,
  shareReplay,
  switchMap,
  take,
  timeout,
} from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { SyncAlreadyInProgressError } from '../../pfapi/api/errors/errors';
import { SyncConfig } from '../../features/config/global-config.model';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { SnackService } from '../../core/snack/snack.service';
import {
  AuthFailSPError,
  CanNotMigrateMajorDownError,
  ConflictData,
  DecryptError,
  DecryptNoPasswordError,
  LockPresentError,
  NoRemoteModelFile,
  PotentialCorsError,
  RevMismatchForModelError,
  SyncInvalidTimeValuesError,
  SyncProviderId,
  SyncStatus,
} from '../../pfapi/api';
import { PfapiService } from '../../pfapi/pfapi.service';
import { T } from '../../t.const';
import { getSyncErrorStr } from './get-sync-error-str';
import { DialogGetAndEnterAuthCodeComponent } from './dialog-get-and-enter-auth-code/dialog-get-and-enter-auth-code.component';
import { DialogConflictResolutionResult } from './sync.model';
import { DialogSyncConflictComponent } from './dialog-sync-conflict/dialog-sync-conflict.component';
import { ReminderService } from '../../features/reminder/reminder.service';
import { DataInitService } from '../../core/data-init/data-init.service';
import { DialogSyncInitialCfgComponent } from './dialog-sync-initial-cfg/dialog-sync-initial-cfg.component';
import { DialogIncompleteSyncComponent } from './dialog-incomplete-sync/dialog-incomplete-sync.component';
import { DialogHandleDecryptErrorComponent } from './dialog-handle-decrypt-error/dialog-handle-decrypt-error.component';
import { DialogIncoherentTimestampsErrorComponent } from './dialog-incoherent-timestamps-error/dialog-incoherent-timestamps-error.component';
import { SyncLog } from '../../core/log';
import { promiseTimeout } from '../../util/promise-timeout';
import { devError } from '../../util/dev-error';
import { UserInputWaitStateService } from './user-input-wait-state.service';
import { LegacySyncProvider } from './legacy-sync-provider.model';
import { SYNC_WAIT_TIMEOUT_MS, SYNC_REINIT_DELAY_MS } from './sync.const';
import { SuperSyncStatusService } from '../../core/persistence/operation-log/sync/super-sync-status.service';
import { IS_ELECTRON } from '../../app.constants';
import { OperationLogStoreService } from '../../core/persistence/operation-log/store/operation-log-store.service';

/**
 * Converts LegacySyncProvider to SyncProviderId.
 * These enums have identical values but are different types for historical reasons.
 * This provides a type-safe conversion without unsafe double assertions.
 */
const toSyncProviderId = (legacy: LegacySyncProvider | null): SyncProviderId | null => {
  if (legacy === null) return null;
  // SyncProviderId and LegacySyncProvider have identical string values
  // Runtime check ensures safety if they ever diverge
  const providerId = legacy as unknown;
  if (Object.values(SyncProviderId).includes(providerId as SyncProviderId)) {
    return providerId as SyncProviderId;
  }
  SyncLog.err(`Unknown sync provider: ${legacy}`);
  return null;
};

@Injectable({
  providedIn: 'root',
})
export class SyncWrapperService {
  private _pfapiService = inject(PfapiService);
  private _globalConfigService = inject(GlobalConfigService);
  private _translateService = inject(TranslateService);
  private _snackService = inject(SnackService);
  private _matDialog = inject(MatDialog);
  private _dataInitService = inject(DataInitService);
  private _reminderService = inject(ReminderService);
  private _userInputWaitState = inject(UserInputWaitStateService);
  private _superSyncStatusService = inject(SuperSyncStatusService);
  private _opLogStore = inject(OperationLogStoreService);

  syncState$ = this._pfapiService.syncState$;

  syncCfg$: Observable<SyncConfig> = this._globalConfigService.cfg$.pipe(
    map((cfg) => cfg?.sync),
  );
  syncProviderId$: Observable<SyncProviderId | null> = this.syncCfg$.pipe(
    map((cfg) => toSyncProviderId(cfg.syncProvider)),
  );

  syncInterval$: Observable<number> = this.syncCfg$.pipe(map((cfg) => cfg.syncInterval));

  isEnabledAndReady$: Observable<boolean> =
    this._pfapiService.isSyncProviderEnabledAndReady$.pipe();

  // NOTE we don't use this._pfapiService.isSyncInProgress$ since it does not include handling and re-init view model
  private _isSyncInProgress$ = new BehaviorSubject(false);
  isSyncInProgress$ = this._isSyncInProgress$.asObservable();

  /**
   * Observable for UI: true when Super Sync is confirmed fully in sync
   * (no pending ops AND remote recently checked).
   * For non-Super Sync providers, always returns true (shows single checkmark).
   */
  superSyncIsConfirmedInSync$: Observable<boolean> = combineLatest([
    this.syncProviderId$,
    toObservable(this._superSyncStatusService.isConfirmedInSync),
  ]).pipe(
    map(([providerId, isConfirmed]) => {
      if (providerId !== SyncProviderId.SuperSync) {
        return true; // Non-Super Sync always shows single checkmark
      }
      return isConfirmed;
    }),
    distinctUntilChanged(),
    shareReplay(1),
  );

  isSyncInProgressSync(): boolean {
    return this._isSyncInProgress$.getValue();
  }

  // Expose shared user input wait state for other services (e.g., SyncTriggerService)
  isWaitingForUserInput$ = this._userInputWaitState.isWaitingForUserInput$;

  afterCurrentSyncDoneOrSyncDisabled$: Observable<unknown> = this.isEnabledAndReady$.pipe(
    switchMap((isEnabled) =>
      isEnabled
        ? this._isSyncInProgress$.pipe(
            filter((isInProgress) => !isInProgress),
            timeout({
              each: SYNC_WAIT_TIMEOUT_MS,
              with: () =>
                // If waiting for user input, don't error - just wait indefinitely
                this._userInputWaitState.isWaitingForUserInput$.pipe(
                  switchMap((isWaiting) => {
                    if (isWaiting) {
                      // Continue waiting for sync to complete (no timeout)
                      return this._isSyncInProgress$.pipe(
                        filter((isInProgress) => !isInProgress),
                      );
                    }
                    devError('Sync wait timeout exceeded');
                    return of(undefined);
                  }),
                ),
            }),
          )
        : of(undefined),
    ),
    first(),
  );

  async sync(): Promise<SyncStatus | 'HANDLED_ERROR'> {
    // Race condition fix: Check-and-set atomically before starting sync
    if (this._isSyncInProgress$.getValue()) {
      SyncLog.log('Sync already in progress, skipping concurrent sync attempt');
      return 'HANDLED_ERROR';
    }
    this._isSyncInProgress$.next(true);
    return this._sync().finally(() => {
      this._isSyncInProgress$.next(false);
    });
  }

  private async _sync(): Promise<SyncStatus | 'HANDLED_ERROR'> {
    const providerId = await this.syncProviderId$.pipe(take(1)).toPromise();
    if (!providerId) {
      throw new Error('No Sync Provider for sync()');
    }

    try {
      // PERF: For legacy sync providers (WebDAV, Dropbox, LocalFile), sync the vector clock
      // from SUP_OPS to pf.META_MODEL before sync. This bridges the gap between the new
      // atomic write system (vector clock in SUP_OPS) and legacy sync which reads from pf.
      // SuperSync uses operation log directly, so it doesn't need this bridge.
      if (providerId !== SyncProviderId.SuperSync) {
        await this._syncVectorClockToPfapi();
      }

      const r = await this._pfapiService.pf.sync();

      switch (r.status) {
        case SyncStatus.InSync:
          return r.status;

        case SyncStatus.UpdateRemote:
        case SyncStatus.UpdateRemoteAll:
          return r.status;

        case SyncStatus.UpdateLocal:
        case SyncStatus.UpdateLocalAll:
          // Note: We can't create a backup BEFORE the sync because we don't know
          // what operation will happen until after checking with the remote.
          // The data has already been downloaded and saved to the database at this point.
          // Future improvement: modify the pfapi sync service to support pre-download callbacks.

          await this._reInitAppAfterDataModelChange(r.downloadedMainModelData);

          // PERF: After downloading remote data, sync the vector clock from pf.META_MODEL
          // to SUP_OPS.vector_clock. This ensures subsequent syncs correctly detect local
          // changes (the vector clock comparison uses SUP_OPS as source of truth).
          await this._syncVectorClockFromPfapi();

          this._snackService.open({
            msg: T.F.SYNC.S.SUCCESS_DOWNLOAD,
            type: 'SUCCESS',
          });
          return r.status;

        case SyncStatus.NotConfigured:
          this.configuredAuthForSyncProviderIfNecessary(providerId);
          return r.status;

        case SyncStatus.IncompleteRemoteData:
          return r.status;

        case SyncStatus.Conflict: {
          SyncLog.log('Sync conflict detected:', {
            remote: r.conflictData?.remote.lastUpdate,
            local: r.conflictData?.local.lastUpdate,
            lastSync: r.conflictData?.local.lastSyncedUpdate,
            conflictData: r.conflictData,
          });

          // Enhanced debugging for vector clock issues
          SyncLog.log('CONFLICT DEBUG - Vector Clock Analysis:', {
            localVectorClock: r.conflictData?.local.vectorClock,
            remoteVectorClock: r.conflictData?.remote.vectorClock,
            localLastSyncedVectorClock: r.conflictData?.local.lastSyncedVectorClock,
            conflictReason: r.conflictData?.reason,
            additional: r.conflictData?.additional,
          });

          // Signal that we're waiting for user input to prevent sync timeout
          const stopWaiting = this._userInputWaitState.startWaiting('legacy-conflict');
          let res: DialogConflictResolutionResult | undefined;
          try {
            res = await this._openConflictDialog$(
              r.conflictData as ConflictData,
            ).toPromise();
          } finally {
            stopWaiting();
          }

          if (res === 'USE_LOCAL') {
            SyncLog.log('User chose USE_LOCAL, calling uploadAll(true) with force');
            // Use force upload to skip the meta file check and ensure lastUpdate is updated
            await this._pfapiService.pf.uploadAll(true);
            SyncLog.log('uploadAll(true) completed');
            return SyncStatus.UpdateRemoteAll;
          } else if (res === 'USE_REMOTE') {
            await this._pfapiService.pf.downloadAll();
            await this._reInitAppAfterDataModelChange();
            await this._syncVectorClockFromPfapi();
          }
          SyncLog.log({ res });

          return r.status;
        }
      }
    } catch (error) {
      SyncLog.err(error);

      if (error instanceof PotentialCorsError) {
        this._snackService.open({
          msg: T.F.SYNC.S.ERROR_CORS,
          type: 'ERROR',
          // a bit longer since it is a long message
          config: { duration: 12000 },
        });
        return 'HANDLED_ERROR';
      } else if (error instanceof AuthFailSPError) {
        this._snackService.open({
          msg: T.F.SYNC.S.INCOMPLETE_CFG,
          type: 'ERROR',
          actionFn: async () => this._matDialog.open(DialogSyncInitialCfgComponent),
          actionStr: T.F.SYNC.S.BTN_CONFIGURE,
        });
        return 'HANDLED_ERROR';
      } else if (error instanceof SyncInvalidTimeValuesError) {
        // Handle async dialog result properly to avoid silent error swallowing
        this._handleIncoherentTimestampsDialog();
        return 'HANDLED_ERROR';
      } else if (
        error instanceof RevMismatchForModelError ||
        error instanceof NoRemoteModelFile
      ) {
        SyncLog.log(error, Object.keys(error));
        // Extract modelId safely with proper type validation
        const modelId = this._extractModelIdFromError(error);
        // Handle async dialog result properly to avoid silent error swallowing
        this._handleIncompleteSyncDialog(modelId);
        return 'HANDLED_ERROR';
      } else if (error instanceof LockPresentError) {
        this._snackService.open({
          // TODO translate
          msg: T.F.SYNC.S.ERROR_DATA_IS_CURRENTLY_WRITTEN,
          type: 'ERROR',
          actionFn: async () => this._forceUpload(),
          actionStr: T.F.SYNC.S.BTN_FORCE_OVERWRITE,
        });
        return 'HANDLED_ERROR';
      } else if (
        error instanceof DecryptNoPasswordError ||
        error instanceof DecryptError
      ) {
        this._handleDecryptionError();
        return 'HANDLED_ERROR';
      } else if (error instanceof CanNotMigrateMajorDownError) {
        alert(this._translateService.instant(T.F.SYNC.A.REMOTE_MODEL_VERSION_NEWER));
        return 'HANDLED_ERROR';
      } else if (error instanceof SyncAlreadyInProgressError) {
        // Silently ignore concurrent sync attempts (using proper error class)
        SyncLog.log('Sync already in progress, skipping concurrent sync attempt');
        return 'HANDLED_ERROR';
      } else if (this._isPermissionError(error)) {
        this._snackService.open({
          msg: this._getPermissionErrorMessage(),
          type: 'ERROR',
          config: { duration: 12000 },
        });
        return 'HANDLED_ERROR';
      } else {
        const errStr = getSyncErrorStr(error);
        this._snackService.open({
          // msg: T.F.SYNC.S.UNKNOWN_ERROR,
          msg: errStr,
          type: 'ERROR',
          translateParams: {
            err: errStr,
          },
        });
        return 'HANDLED_ERROR';
      }
    }
  }

  private async _forceUpload(): Promise<void> {
    if (!this._c(this._translateService.instant(T.F.SYNC.C.FORCE_UPLOAD))) {
      return;
    }
    try {
      await this._pfapiService.pf.uploadAll(true);
    } catch (e) {
      const errStr = getSyncErrorStr(e);
      this._snackService.open({
        // msg: T.F.SYNC.S.UNKNOWN_ERROR,
        msg: errStr,
        type: 'ERROR',
        translateParams: {
          err: errStr,
        },
      });
    }
  }

  async configuredAuthForSyncProviderIfNecessary(
    providerId: SyncProviderId,
  ): Promise<{ wasConfigured: boolean }> {
    const provider = await this._pfapiService.pf.getSyncProviderById(providerId);

    if (!provider) {
      return { wasConfigured: false };
    }

    if (!provider.getAuthHelper) {
      return { wasConfigured: false };
    }

    if (await provider.isReady()) {
      SyncLog.warn('Provider already configured');
      return { wasConfigured: false };
    }

    try {
      const { authUrl, codeVerifier, verifyCodeChallenge } =
        await provider.getAuthHelper();
      if (authUrl && codeVerifier && verifyCodeChallenge) {
        const authCode = await this._matDialog
          .open(DialogGetAndEnterAuthCodeComponent, {
            restoreFocus: true,
            data: {
              providerName: provider.id,
              url: authUrl,
            },
          })
          .afterClosed()
          .toPromise();
        if (authCode) {
          const r = await verifyCodeChallenge(authCode);
          // Preserve existing config (especially encryptKey) when updating auth
          const existingConfig = await provider.privateCfg.load();
          await this._pfapiService.pf.setPrivateCfgForSyncProvider(provider.id, {
            ...existingConfig,
            ...r,
          });
          // NOTE: exec sync afterward; promise not awaited
          setTimeout(() => {
            this.sync();
          }, 1000);
          return { wasConfigured: true };
        } else {
          return { wasConfigured: false };
        }
      }
    } catch (error) {
      SyncLog.err(error);
      this._snackService.open({
        // TODO don't limit snack to dropbox
        msg: T.F.DROPBOX.S.UNABLE_TO_GENERATE_PKCE_CHALLENGE,
        type: 'ERROR',
      });
      return { wasConfigured: false };
    }
    return { wasConfigured: false };
  }

  /**
   * Handle incoherent timestamps dialog with proper async error handling.
   * Uses fire-and-forget pattern but logs errors instead of swallowing them.
   */
  private _handleIncoherentTimestampsDialog(): void {
    const dialogRef = this._matDialog.open(DialogIncoherentTimestampsErrorComponent, {
      disableClose: true,
      autoFocus: false,
    });

    // Use firstValueFrom for proper async handling
    firstValueFrom(dialogRef.afterClosed())
      .then(async (res) => {
        if (res === 'FORCE_UPDATE_REMOTE') {
          await this._forceUpload();
        } else if (res === 'FORCE_UPDATE_LOCAL') {
          await this._pfapiService.pf.downloadAll();
          await this._reInitAppAfterDataModelChange();
          await this._syncVectorClockFromPfapi();
        }
      })
      .catch((err) => {
        SyncLog.err('Error handling incoherent timestamps dialog result:', err);
      });
  }

  /**
   * Handle incomplete sync dialog with proper async error handling.
   * Uses fire-and-forget pattern but logs errors instead of swallowing them.
   */
  private _handleIncompleteSyncDialog(modelId: string | undefined): void {
    const dialogRef = this._matDialog.open(DialogIncompleteSyncComponent, {
      data: { modelId },
      disableClose: true,
      autoFocus: false,
    });

    // Use firstValueFrom for proper async handling
    firstValueFrom(dialogRef.afterClosed())
      .then(async (res) => {
        if (res === 'FORCE_UPDATE_REMOTE') {
          await this._forceUpload();
        }
      })
      .catch((err) => {
        SyncLog.err('Error handling incomplete sync dialog result:', err);
      });
  }

  /**
   * Safely extract modelId from error with proper type validation.
   */
  private _extractModelIdFromError(
    error: RevMismatchForModelError | NoRemoteModelFile,
  ): string | undefined {
    if (!error.additionalLog) {
      return undefined;
    }
    // Handle both array and string formats
    if (Array.isArray(error.additionalLog) && error.additionalLog.length > 0) {
      const firstItem = error.additionalLog[0];
      return typeof firstItem === 'string' ? firstItem : undefined;
    }
    if (typeof error.additionalLog === 'string') {
      return error.additionalLog;
    }
    return undefined;
  }

  private _handleDecryptionError(): void {
    this._matDialog
      .open(DialogHandleDecryptErrorComponent, {
        disableClose: true,
        autoFocus: false,
      })
      .afterClosed()
      .subscribe(({ isReSync, isForceUpload }) => {
        if (isReSync) {
          this.sync();
        }
        if (isForceUpload) {
          this._forceUpload();
        }
      });
  }

  private async _reInitAppAfterDataModelChange(
    downloadedMainModelData?: Record<string, unknown>,
  ): Promise<void> {
    SyncLog.log('Starting data re-initialization after sync...');

    try {
      await Promise.all([
        // Use reInitFromRemoteSync() which now uses the passed downloaded data
        // instead of reading from IndexedDB (entity models aren't stored there)
        this._dataInitService.reInitFromRemoteSync(downloadedMainModelData),
      ]);
      // wait an extra frame to potentially avoid follow up problems
      await promiseTimeout(SYNC_REINIT_DELAY_MS);
      SyncLog.log('Data re-initialization complete');
      // Signal that data reload is complete
    } catch (error) {
      SyncLog.err('Error during data re-initialization:', error);
      throw error;
    }
  }

  private _c(str: string): boolean {
    return confirm(this._translateService.instant(str));
  }

  private _isPermissionError(error: unknown): boolean {
    const errStr = String(error);
    return /EROFS|EACCES|EPERM|read-only file system|permission denied/i.test(errStr);
  }

  private _getPermissionErrorMessage(): string {
    if (IS_ELECTRON && window.ea?.isFlatpak?.()) {
      return T.F.SYNC.S.ERROR_PERMISSION_FLATPAK;
    }
    if (IS_ELECTRON && window.ea?.isSnap?.()) {
      return T.F.SYNC.S.ERROR_PERMISSION_SNAP;
    }
    return T.F.SYNC.S.ERROR_PERMISSION;
  }

  private lastConflictDialog?: MatDialogRef<any, any>;

  private _openConflictDialog$(
    conflictData: ConflictData,
  ): Observable<DialogConflictResolutionResult> {
    if (this.lastConflictDialog) {
      this.lastConflictDialog.close();
    }
    this.lastConflictDialog = this._matDialog.open(DialogSyncConflictComponent, {
      restoreFocus: true,
      autoFocus: false,
      disableClose: true,
      data: conflictData,
    });
    return this.lastConflictDialog.afterClosed();
  }

  /**
   * Syncs the current vector clock from SUP_OPS to pf.META_MODEL.
   * Called before legacy sync providers start syncing.
   * This ensures the legacy sync provider sees the latest vector clock.
   */
  private async _syncVectorClockToPfapi(): Promise<void> {
    const vcEntry = await this._opLogStore.getVectorClockEntry();

    if (vcEntry) {
      SyncLog.log('[SyncWrapper] Syncing vector clock to pf.META_MODEL', {
        clockSize: Object.keys(vcEntry.clock).length,
        lastUpdate: vcEntry.lastUpdate,
      });

      await this._pfapiService.pf.metaModel.setVectorClockFromBridge(
        vcEntry.clock,
        vcEntry.lastUpdate,
      );
    } else {
      SyncLog.log('[SyncWrapper] No vector clock in SUP_OPS, skipping sync');
    }
  }

  /**
   * Syncs the vector clock from pf.META_MODEL to SUP_OPS.vector_clock.
   * Called after downloading data from remote (UpdateLocal/UpdateLocalAll).
   * This ensures SUP_OPS has the latest vector clock from the remote,
   * so subsequent syncs correctly detect changes.
   */
  private async _syncVectorClockFromPfapi(): Promise<void> {
    const metaModel = await this._pfapiService.pf.metaModel.load();
    if (metaModel?.vectorClock && Object.keys(metaModel.vectorClock).length > 0) {
      SyncLog.log('[SyncWrapper] Syncing vector clock from pf.META_MODEL to SUP_OPS', {
        clockSize: Object.keys(metaModel.vectorClock).length,
        lastUpdate: metaModel.lastUpdate,
      });

      await this._opLogStore.setVectorClock(metaModel.vectorClock);
    } else {
      SyncLog.log(
        '[SyncWrapper] No vector clock in pf.META_MODEL, skipping sync to SUP_OPS',
      );
    }
  }
}

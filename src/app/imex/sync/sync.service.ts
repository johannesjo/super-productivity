import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { filter, map, switchMap, take } from 'rxjs/operators';
import { SyncConfig } from '../../features/config/global-config.model';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { SnackService } from '../../core/snack/snack.service';
import { GlobalProgressBarService } from '../../core-ui/global-progress-bar/global-progress-bar.service';
import {
  AuthFailError,
  ImpossibleError,
  LockFilePresentError,
  SyncProviderId,
  SyncStatus,
  UnableToWriteLockFileError,
} from '../../pfapi/api';
import { PfapiService } from '../../pfapi/pfapi.service';
import { T } from '../../t.const';
import { getSyncErrorStr } from './get-sync-error-str';
import { DialogGetAndEnterAuthCodeComponent } from './dialog-get-and-enter-auth-code/dialog-get-and-enter-auth-code.component';
import {
  DialogConflictResolutionResult,
  DialogPermissionResolutionResult,
} from './sync.model';
import { DialogSyncConflictComponent } from './dialog-dbx-sync-conflict/dialog-sync-conflict.component';
import { DialogSyncPermissionComponent } from './dialog-sync-permission/dialog-sync-permission.component';
import { DataInitService } from '../../core/data-init/data-init.service';
import { ReminderService } from '../../features/reminder/reminder.service';

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  private _pfapiWrapperService = inject(PfapiService);
  private _globalConfigService = inject(GlobalConfigService);
  private _translateService = inject(TranslateService);
  private _snackService = inject(SnackService);
  private _matDialog = inject(MatDialog);
  private _dataInitService = inject(DataInitService);
  private _reminderService = inject(ReminderService);
  private _globalProgressBarService = inject(GlobalProgressBarService);
  // private _imexViewService = inject(ImexViewService);

  // TODO
  isCurrentProviderInSync$ = this._pfapiWrapperService.isCurrentProviderInSync$;

  syncCfg$: Observable<SyncConfig> = this._globalConfigService.cfg$.pipe(
    map((cfg) => cfg?.sync),
  );
  syncProviderId$: Observable<SyncProviderId | null> = this.syncCfg$.pipe(
    // TODO local file sync for electron and android provider interface
    // NOTE: types are compatible
    map((cfg) => cfg.syncProvider as SyncProviderId | null),
  );

  syncInterval$: Observable<number> = this.syncCfg$.pipe(map((cfg) => cfg.syncInterval));
  isEnabled$: Observable<boolean> = this.syncCfg$.pipe(map((cfg) => cfg.isEnabled));

  isEnabledAndReady$: Observable<boolean> =
    this._pfapiWrapperService.isSyncProviderEnabledAndReady$.pipe();

  isSyncing$ = new BehaviorSubject<boolean>(false);

  _afterCurrentSyncDoneIfAny$: Observable<unknown> = this.isSyncing$.pipe(
    filter((isSyncing) => !isSyncing),
  );

  afterCurrentSyncDoneOrSyncDisabled$: Observable<unknown> = this.isEnabled$.pipe(
    switchMap((isEnabled) =>
      isEnabled ? this._afterCurrentSyncDoneIfAny$ : of(undefined),
    ),
  );

  // TODO move someplace else

  async sync(): Promise<SyncStatus | 'USER_ABORT' | 'HANDLED_ERROR'> {
    const providerId = await this.syncProviderId$.pipe(take(1)).toPromise();
    if (!providerId) {
      //   // TODO handle different
      throw new Error('No Sync Provider for sync()');
    }

    try {
      this._globalProgressBarService.countUp('SYNC');
      this.isSyncing$.next(true);
      const r = await this._pfapiWrapperService.pf.sync();

      this.isSyncing$.next(false);
      this._globalProgressBarService.countDown();

      switch (r.status) {
        case SyncStatus.InSync:
          return r.status;

        case SyncStatus.UpdateRemote:
        case SyncStatus.UpdateRemoteAll:
          return r.status;

        case SyncStatus.UpdateLocal:
        case SyncStatus.UpdateLocalAll:
          // TODO dare to do more complicated stuff for UpdateLocal
          await this._reInitAppAfterDataModelChange();
          return r.status;

        case SyncStatus.NotConfigured:
          // TODO try only once to configure or handle via snack
          if (await this._configureActiveSyncProvider()) {
            return this.sync();
          }
          return r.status;

        case SyncStatus.IncompleteRemoteData:
          return r.status;

        case SyncStatus.Conflict:
          const res = await this._openConflictDialog$({
            remote: r.conflictData?.remote.lastUpdate as number,
            local: r.conflictData?.local.lastUpdate as number,
            lastSync: r.conflictData?.local.lastSyncedUpdate as number,
          }).toPromise();

          if (res === 'USE_LOCAL') {
            this._globalProgressBarService.countUp('SYNC');
            this.isSyncing$.next(true);
            await this._pfapiWrapperService.pf.uploadAll();
            this.isSyncing$.next(false);
            this._globalProgressBarService.countDown();
            return SyncStatus.UpdateLocalAll;
          } else if (res === 'USE_REMOTE') {
            this._globalProgressBarService.countUp('SYNC');
            this.isSyncing$.next(true);
            await this._pfapiWrapperService.pf.downloadAll();
            await this._reInitAppAfterDataModelChange();
            this.isSyncing$.next(false);
            this._globalProgressBarService.countDown();
            return SyncStatus.UpdateLocalAll;
          }

          console.log({ res });

          // TODO implement and test force cases
          // if (!this._c(T.F.SYNC.C.EMPTY_SYNC)) {
          // TODO implement and test force cases
          // this._pfapiWrapperService.pf
          // switch (r.conflictData?.reason) {
          //   case ConflictReason.NoLastSync:
          // }
          // }
          // return 'USER_ABORT';
          return r.status;
      }
    } catch (error: any) {
      this._globalProgressBarService.countDown();
      this.isSyncing$.next(false);
      console.error(error);

      if (error instanceof AuthFailError) {
        this._snackService.open({
          msg: T.F.SYNC.S.INCOMPLETE_CFG,
          type: 'ERROR',
        });
        return 'HANDLED_ERROR';
      } else if (
        error instanceof LockFilePresentError ||
        error instanceof UnableToWriteLockFileError
      ) {
        // TODO improve handling
        this._snackService.open({
          // msg: T.F.SYNC.S.INCOMPLETE_CFG,
          msg: 'Remote Data is currently being written',
          type: 'ERROR',
        });
        return 'HANDLED_ERROR';
      } else {
        const errStr = getSyncErrorStr(error);
        alert('IMEXSyncService ERR: ' + errStr);
        // TODO check if needed
        // if (errStr.includes(KNOWN_SYNC_ERROR_PREFIX)) {
        //   this._snackService.open({
        //     msg: errStr.replace(KNOWN_SYNC_ERROR_PREFIX, ''),
        //     type: 'ERROR',
        //   });
        //   return 'HANDLED_ERROR'
        // } else {
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
      throw new Error('unhandled sync error');
    }
  }

  private async _reInitAppAfterDataModelChange(): Promise<void> {
    // TODO maybe do it more elegantly with pfapi.events
    // this._imexViewService.setDataImportInProgress(true);
    await Promise.all([
      // reload view model from ls
      this._dataInitService.reInit(true),
      this._reminderService.reloadFromDatabase(),
    ]);
    // this._imexViewService.setDataImportInProgress(false);
    // TODO better solution, unclear why needed
    // setTimeout(() => {
    // this._imexViewService.setDataImportInProgress(false);
    // });
  }

  private _c(str: string): boolean {
    return confirm(this._translateService.instant(str));
  }

  private async _configureActiveSyncProvider(): Promise<boolean> {
    const provider = this._pfapiWrapperService.pf.getActiveSyncProvider();
    if (!provider) {
      throw new ImpossibleError('No provider');
    }

    if (provider.getAuthHelper) {
      try {
        const { authUrl, codeVerifier, verifyCodeChallenge } =
          await provider.getAuthHelper();
        if (authUrl && codeVerifier && verifyCodeChallenge) {
          const authCode = await this._matDialog
            .open(DialogGetAndEnterAuthCodeComponent, {
              restoreFocus: true,
              data: {
                // TODO better name
                providerName: provider.id,
                url: authUrl,
              },
            })
            .afterClosed()
            .toPromise();

          if (authCode) {
            const r = await verifyCodeChallenge(authCode);
            await this._pfapiWrapperService.pf.setPrivateCfgForSyncProvider(
              provider.id,
              r,
            );
          } else {
            throw new Error('No auth code');
          }
        }
      } catch (error) {
        console.error(error);
        this._snackService.open({
          // TODO don't limit snack to dropbox
          msg: T.F.DROPBOX.S.UNABLE_TO_GENERATE_PKCE_CHALLENGE,
          type: 'ERROR',
        });
      }
      return true;
    }

    this._snackService.open({
      msg: T.F.SYNC.S.INCOMPLETE_CFG,
      type: 'ERROR',
    });
    return false;
  }

  private lastDialog?: MatDialogRef<any, any>;

  private _openConflictDialog$({
    remote,
    local,
    lastSync,
  }: {
    remote: number | null;
    local: number | null;
    lastSync: number;
  }): Observable<DialogConflictResolutionResult> {
    if (this.lastDialog) {
      this.lastDialog.close();
    }
    this.lastDialog = this._matDialog.open(DialogSyncConflictComponent, {
      restoreFocus: true,
      disableClose: true,
      data: {
        remote,
        local,
        lastSync,
      },
    });
    return this.lastDialog.afterClosed();
  }

  private _openPermissionDialog$(): Observable<DialogPermissionResolutionResult> {
    return this._matDialog
      .open(DialogSyncPermissionComponent, {
        restoreFocus: true,
        disableClose: true,
      })
      .afterClosed();
  }
}

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { concatMap, distinctUntilChanged } from 'rxjs/operators';
import { DropboxApiService } from './dropbox-api.service';
import {
  DROPBOX_SYNC_ARCHIVE_FILE_PATH,
  DROPBOX_SYNC_MAIN_FILE_PATH,
} from './dropbox.const';
import { SyncGetRevResult } from '../sync.model';
import { DataInitService } from '../../../core/data-init/data-init.service';
import { SnackService } from '../../../core/snack/snack.service';
import { T } from '../../../t.const';
import {
  SyncProvider,
  SyncProviderServiceInterface,
  SyncTarget,
} from '../sync-provider.model';
import { Store } from '@ngrx/store';
import { triggerDropboxAuthDialog } from './store/dropbox.actions';

@Injectable({ providedIn: 'root' })
export class DropboxSyncService implements SyncProviderServiceInterface {
  private _dropboxApiService = inject(DropboxApiService);
  private _dataInitService = inject(DataInitService);
  private _snackService = inject(SnackService);
  private _store = inject(Store);

  id: SyncProvider = SyncProvider.Dropbox;
  isUploadForcePossible: boolean = true;

  isReady$: Observable<boolean> = this._dataInitService.isAllDataLoadedInitially$.pipe(
    concatMap(() => this._dropboxApiService.isTokenAvailable$),
    distinctUntilChanged(),
  );

  async getFileRevAndLastClientUpdate(
    syncTarget: SyncTarget,
    localRev: string,
  ): Promise<{ rev: string; clientUpdate: number } | SyncGetRevResult> {
    const filePath = this._getFilePath(syncTarget);

    try {
      const r = await this._dropboxApiService.getMetaData(filePath);
      // NOTE: response does not include milliseconds, which could lead to uncool edge cases... :(
      const d = new Date(r.client_modified);
      return {
        clientUpdate: d.getTime(),
        rev: r.rev,
      };
    } catch (e) {
      const isAxiosError = !!(e && (e as any).response && (e as any).response.status);
      if (
        isAxiosError &&
        (e as any).response.data &&
        // NOTE: sometimes 'path/not_found/..' and sometimes 'path/not_found/...'
        (e as any).response.data.error_summary?.includes('path/not_found')
      ) {
        return 'NO_REMOTE_DATA';
      } else if (isAxiosError && (e as any).response.status === 401) {
        if (
          (e as any).response.data?.error_summary?.includes('expired_access_token') ||
          (e as any).response.data?.error_summary?.includes('invalid_access_token')
        ) {
          console.log('EXPIRED or INVALID TOKEN, trying to refresh');
          const refreshResult =
            await this._dropboxApiService.updateAccessTokenFromRefreshTokenIfAvailable();
          if (refreshResult === 'SUCCESS') {
            return this.getFileRevAndLastClientUpdate(syncTarget, localRev);
          }
        }
        this._snackService.open({
          msg: T.F.DROPBOX.S.AUTH_ERROR,
          type: 'ERROR',
          actionStr: T.F.DROPBOX.S.AUTH_ERROR_ACTION,
          actionFn: () => this._store.dispatch(triggerDropboxAuthDialog()),
        });
        return 'HANDLED_ERROR';
      } else {
        console.error(e);
        throw new Error(e as any);
      }
    }
  }

  async downloadFileData(
    syncTarget: SyncTarget,
    localRev: string,
  ): Promise<{ rev: string; dataStr: string }> {
    const r = await this._dropboxApiService.download<string>({
      path: this._getFilePath(syncTarget),
      localRev,
    });
    return {
      rev: r.meta.rev,
      dataStr: r.data,
    };
  }

  async uploadFileData(
    syncTarget: SyncTarget,
    dataStr: string,
    localRev: string,
    isForceOverwrite: boolean = false,
  ): Promise<string | Error> {
    const r = await this._dropboxApiService.upload({
      path: this._getFilePath(syncTarget),
      data: dataStr,
      localRev,
      isForceOverwrite,
    });
    return r.rev;
  }

  private _getFilePath(syncTarget: SyncTarget): string {
    return syncTarget === 'MAIN'
      ? DROPBOX_SYNC_MAIN_FILE_PATH
      : DROPBOX_SYNC_ARCHIVE_FILE_PATH;
  }
}

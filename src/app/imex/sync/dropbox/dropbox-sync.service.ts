import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { concatMap, distinctUntilChanged } from 'rxjs/operators';
import { DropboxApiService } from './dropbox-api.service';
import { DROPBOX_SYNC_MAIN_FILE_PATH } from './dropbox.const';
import { SyncGetRevResult } from '../sync.model';
import { DataInitService } from '../../../core/data-init/data-init.service';
import { SnackService } from '../../../core/snack/snack.service';
import { environment } from '../../../../environments/environment';
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
  id: SyncProvider = SyncProvider.Dropbox;
  isUploadForcePossible: boolean = true;

  isReady$: Observable<boolean> = this._dataInitService.isAllDataLoadedInitially$.pipe(
    concatMap(() => this._dropboxApiService.isTokenAvailable$),
    distinctUntilChanged(),
  );

  constructor(
    private _dropboxApiService: DropboxApiService,
    private _dataInitService: DataInitService,
    private _snackService: SnackService,
    private _store: Store,
  ) {}

  // TODO refactor in a way that it doesn't need to trigger uploadFileData itself
  // NOTE: this does not include milliseconds, which could lead to uncool edge cases... :(
  async getFileRevAndLastClientUpdate(
    syncTarget: SyncTarget,
    localRev: string,
  ): Promise<{ rev: string; clientUpdate: number } | SyncGetRevResult> {
    try {
      const r = await this._dropboxApiService.getMetaData(DROPBOX_SYNC_MAIN_FILE_PATH);
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
        if (environment.production) {
          // todo fix this
          return e as any;
        } else {
          throw new Error('DBX: Unknown error');
        }
      }
    }
  }

  async downloadFileData(
    syncTarget: SyncTarget,
    localRev: string,
  ): Promise<{ rev: string; dataStr: string }> {
    const r = await this._dropboxApiService.download<string>({
      path: DROPBOX_SYNC_MAIN_FILE_PATH,
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
    clientModified: number,
    localRev: string,
    isForceOverwrite: boolean = false,
  ): Promise<string | Error> {
    try {
      const r = await this._dropboxApiService.upload({
        path: DROPBOX_SYNC_MAIN_FILE_PATH,
        data: dataStr,
        clientModified,
        localRev,
        isForceOverwrite,
      });
      return r.rev;
    } catch (e) {
      console.error(e);
      // TODO fix this
      return e as any;
    }
  }

  private async _download(localRev: string): Promise<{ rev: string; dataStr: string }> {
    const r = await this._dropboxApiService.download<string>({
      path: DROPBOX_SYNC_MAIN_FILE_PATH,
      localRev,
    });
    return {
      rev: r.meta.rev,
      dataStr: r.data,
    };
  }

  private async upload(
    dataStr: string,
    clientModified: number,
    localRev: string,
    isForceOverwrite: boolean = false,
  ): Promise<string | Error> {
    try {
      const r = await this._dropboxApiService.upload({
        path: DROPBOX_SYNC_MAIN_FILE_PATH,
        data: dataStr,
        clientModified,
        localRev,
        isForceOverwrite,
      });
      return r.rev;
    } catch (e) {
      console.error(e);
      // TODO fix this
      return e as any;
    }
  }
}

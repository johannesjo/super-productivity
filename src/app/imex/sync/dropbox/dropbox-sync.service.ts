import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { concatMap, distinctUntilChanged } from 'rxjs/operators';
import { DropboxApiService } from './dropbox-api.service';
import { DROPBOX_SYNC_FILE_PATH } from './dropbox.const';
import { AppDataComplete, SyncGetRevResult } from '../sync.model';
import { DataInitService } from '../../../core/data-init/data-init.service';
import { SnackService } from '../../../core/snack/snack.service';
import { environment } from '../../../../environments/environment';
import { T } from '../../../t.const';
import { SyncProvider, SyncProviderServiceInterface } from '../sync-provider.model';
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

  // TODO refactor in a way that it doesn't need to trigger uploadAppData itself
  // NOTE: this does not include milliseconds, which could lead to uncool edge cases... :(
  async getRevAndLastClientUpdate(
    localRev: string,
  ): Promise<{ rev: string; clientUpdate: number } | SyncGetRevResult> {
    try {
      const r = await this._dropboxApiService.getMetaData(DROPBOX_SYNC_FILE_PATH);
      const d = new Date(r.client_modified);
      return {
        clientUpdate: d.getTime(),
        rev: r.rev,
      };
    } catch (e) {
      const isAxiosError = !!(e && e.response && e.response.status);
      if (
        isAxiosError &&
        e.response.data &&
        e.response.data.error_summary === 'path/not_found/..'
      ) {
        return 'NO_REMOTE_DATA';
      } else if (isAxiosError && e.response.status === 401) {
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
          return e;
        } else {
          throw new Error('DBX: Unknown error');
        }
      }
    }
  }

  async downloadAppData(
    localRev: string,
  ): Promise<{ rev: string; data: AppDataComplete }> {
    const r = await this._dropboxApiService.download<AppDataComplete>({
      path: DROPBOX_SYNC_FILE_PATH,
      localRev,
    });
    return {
      rev: r.meta.rev,
      data: r.data,
    };
  }

  async uploadAppData(
    data: AppDataComplete,
    localRev: string,
    isForceOverwrite: boolean = false,
  ): Promise<string | Error> {
    try {
      const r = await this._dropboxApiService.upload({
        path: DROPBOX_SYNC_FILE_PATH,
        data,
        clientModified: data.lastLocalSyncModelChange as number,
        localRev,
        isForceOverwrite,
      });
      return r.rev;
    } catch (e) {
      console.error(e);
      return e;
    }
  }
}

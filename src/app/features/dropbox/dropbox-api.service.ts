import {Injectable} from '@angular/core';

import {Dropbox} from 'dropbox';
import {DROPBOX_APP_KEY} from './dropbox.const';
import {GlobalConfigService} from '../config/global-config.service';
import {map} from 'rxjs/operators';
import {DataInitService} from '../../core/data-init/data-init.service';

@Injectable({
  providedIn: 'root'
})
export class DropboxApiService {
  private _accessToken$ = this._globalConfigService.cfg$.pipe(map(cfg => cfg && cfg.dropboxSync && cfg.dropboxSync.accessToken));

  isLoggedIn$ = this._accessToken$.pipe(
    map((token) => !!token)
  );

  private _dbx: Dropbox = new Dropbox({
    clientId: DROPBOX_APP_KEY,
  });

  private _init$ = this._dataInitService.isAllDataLoadedInitially$;

  constructor(
    private _globalConfigService: GlobalConfigService,
    private _dataInitService: DataInitService,
  ) {
    this._accessToken$.subscribe((v) => console.log('_accessToken$', v));
    this._globalConfigService.cfg$.subscribe((v) => console.log('this._globalConfigService.cfg$', v));

    this._accessToken$.subscribe((accessToken) => {
      console.log(accessToken);
      if (accessToken) {
        this._dbx.setAccessToken(accessToken.trim());
        this._dbx.usersGetCurrentAccount().then((response) => {
          console.log(response);
        }).catch((e) => {
          console.error(e);
          // warn
        });
      }
    });
  }

  async loadFile(args: DropboxTypes.files.DownloadArg): Promise<DropboxTypes.files.FileMetadata> {
    await this._init$.toPromise();
    return this._dbx.filesDownload(args);
  }

  async uploadFile(args: DropboxTypes.files.CommitInfo): Promise<DropboxTypes.files.FileMetadata> {
    await this._init$.toPromise();
    return this._dbx.filesUpload(args);
  }
}

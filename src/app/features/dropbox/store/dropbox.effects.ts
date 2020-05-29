import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {loadDataComplete} from '../../../root-store/meta/load-data-complete.action';
import {GlobalConfigActionTypes} from '../../config/store/global-config.actions';
import {distinctUntilChanged, switchMap, tap} from 'rxjs/operators';
import {DropboxApiService} from '../dropbox-api.service';
import {DropboxSyncService} from '../dropbox-sync.service';
import {GlobalConfigService} from '../../config/global-config.service';
import {DataInitService} from '../../../core/data-init/data-init.service';
import {GlobalSyncService} from '../../../core/global-sync/global-sync.service';


@Injectable()
export class DropboxEffects {
  // // TODO handle login and stuff as effect
  // @Effect({dispatch: false}) loginOnEnabled$: any = this._actions$.pipe(
  //   ofType(
  //     loadDataComplete.type,
  //     GlobalConfigActionTypes.LoadGlobalConfig,
  //     GlobalConfigActionTypes.UpdateGlobalConfigSection,
  //   ),
  //   switchMap(() => this._dataInitService.isAllDataLoadedInitially$),
  //   switchMap(() => this._dropboxSyncService.isEnabled$),
  //   distinctUntilChanged(),
  //   tap(isEnabled => {
  //     isEnabled
  //       ? this._dropboxSyncApiService.signIn()
  //       : this._dropboxSyncApiService.signOut();
  //   }),
  // );

  // @Effect({dispatch: false}) triggerSync$: any = this._actions$.pipe(
  //   ofType(
  //     loadDataComplete.type,
  //     GlobalConfigActionTypes.LoadGlobalConfig,
  //     GlobalConfigActionTypes.UpdateGlobalConfigSection,
  //   ),
  //   switchMap(() => this._dataInitService.isAllDataLoadedInitially$),
  //   switchMap(() => combineLatest([
  //     this._dropboxSyncApiService.isLoggedIn$,
  //     this._dropboxSyncService.isEnabled$,
  //     this._dropboxSyncService.syncInterval$,
  //   ]).pipe(
  //     filter(([isLoggedIn, isEnabled, syncInterval]) =>
  //       isLoggedIn && isEnabled && syncInterval >= DROPBOX_MIN_SYNC_INTERVAL),
  //     switchMap(([, , syncInterval]) =>
  //       this._globalSyncService.getSyncTrigger$(syncInterval).pipe(
  //         mapTo(new SaveForSync())
  //       )
  //     ),
  //   )),
  // );

  constructor(
    private _actions$: Actions,
    private _dropboxSyncApiService: DropboxApiService,
    private _dropboxSyncService: DropboxSyncService,
    private _globalConfigService: GlobalConfigService,
    private _globalSyncService: GlobalSyncService,
    private _dataInitService: DataInitService,
  ) {
  }


}

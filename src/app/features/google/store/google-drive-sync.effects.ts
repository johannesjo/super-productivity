import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { NotifyService } from '../../../core/notify/notify.service';

import { ElectronService } from 'ngx-electron';
import { ConfigActionTypes } from '../../config/store/config.actions';
import { distinctUntilChanged, flatMap, map, switchMap, tap } from 'rxjs/operators';
import { combineLatest, EMPTY, Observable, timer } from 'rxjs';
import { GoogleDriveSyncService } from '../google-drive-sync.service';
import { GoogleApiService } from '../google-api.service';

// TODO send message to electron when current task changes here

@Injectable()
export class GoogleDriveSyncEffects {
  isAutoSyncToRemote$ = this._googleDriveSyncService.config$.pipe(
    map(cfg => cfg.isAutoSyncToRemote), distinctUntilChanged()
  );
  syncInterval$ = this._googleDriveSyncService.config$.pipe(
    map(cfg => cfg.syncInterval), distinctUntilChanged()
  );

  sync$: Observable<any> = combineLatest(
    this.isAutoSyncToRemote$,
    this.syncInterval$,
    this._googleApiService.isLoggedIn$,
  ).pipe(
    switchMap(([isEnabled, syncInterval, isLoggedIn]) => {
      // TODO remove
      syncInterval = 5000;
      isLoggedIn = true;

      return (isLoggedIn && isEnabled && syncInterval >= 5000)
        ? timer(syncInterval, syncInterval).pipe(
          flatMap(() => this._googleDriveSyncService.saveForSync()),
        )
        : EMPTY;
    }),
  );

  @Effect({dispatch: false}) triggerSync$: any = this._actions$
    .pipe(
      ofType(
        ConfigActionTypes.LoadConfig,
      ),
      tap(v => this.sync$.subscribe()),
      // TODO make this work
      // map(v => this.sync$),
    );


  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _googleDriveSyncService: GoogleDriveSyncService,
    private _googleApiService: GoogleApiService,
    private _notifyService: NotifyService,
    private _electronService: ElectronService,
    private _persistenceService: PersistenceService,
  ) {
  }

}



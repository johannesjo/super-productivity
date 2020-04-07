import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable, of, ReplaySubject} from 'rxjs';
import {distinctUntilChanged, filter, map, shareReplay, startWith, switchMap, take} from 'rxjs/operators';
import {GlobalConfigService} from '../../features/config/global-config.service';
import {SyncProvider} from './sync-provider';

// Weird view service
// TODO poor design, replace with something better
@Injectable({
  providedIn: 'root',
})
export class GlobalSyncService {
  private _isSyncActive$: Observable<boolean> = this._globalConfigService.onCfgLoaded$.pipe(
    switchMap(() => this._globalConfigService.googleDriveSyncCfg$.pipe(
      map(cfg => cfg && cfg.isEnabled && cfg.isLoadRemoteDataOnStartup && cfg.isAutoLogin),
      distinctUntilChanged(),
    )),
  );

  // keep it super simple for now
  private _isInitialSyncDoneManual$ = new ReplaySubject<boolean>(1);

  private _isInitialSyncDone$: Observable<boolean> = this._isSyncActive$.pipe(
    switchMap((isActive) => {
      return isActive
        ? this._isInitialSyncDoneManual$.asObservable()
        : of(true);
    }),
    startWith(false),
  );

  afterInitialSyncDone$: Observable<boolean> = this._isInitialSyncDone$.pipe(
    filter(isDone => isDone),
    take(1),
    shareReplay(1),
  );

  constructor(
    private readonly _store: Store<any>,
    private readonly _globalConfigService: GlobalConfigService,
  ) {
  }

  // tslint:disable-next-line
  setInitialSyncDone(val: boolean, syncProvider: SyncProvider) {
    this._isInitialSyncDoneManual$.next(val);
  }
}

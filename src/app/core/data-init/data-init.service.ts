import { inject, Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { mapTo, take } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { allDataWasLoaded } from '../../root-store/meta/all-data-was-loaded.actions';
import { PfapiService } from '../../pfapi/pfapi.service';
import { DataInitStateService } from './data-init-state.service';
import { UserProfileService } from '../../features/user-profile/user-profile.service';
import { OperationLogHydratorService } from '../persistence/operation-log/operation-log-hydrator.service';

@Injectable({ providedIn: 'root' })
export class DataInitService {
  private _pfapiService = inject(PfapiService);
  private _store$ = inject<Store<any>>(Store);
  private _dataInitStateService = inject(DataInitStateService);
  private _userProfileService = inject(UserProfileService);
  private _operationLogHydratorService = inject(OperationLogHydratorService);

  private _isAllDataLoadedInitially$: Observable<boolean> = from(this.reInit()).pipe(
    mapTo(true),
  );

  constructor() {
    // TODO better construction than this
    this._isAllDataLoadedInitially$.pipe(take(1)).subscribe((v) => {
      // here because to avoid circular dependencies
      this._store$.dispatch(allDataWasLoaded());
      this._dataInitStateService._neverUpdateOutsideDataInitService$.next(v);
    });
  }

  // NOTE: it's important to remember that this doesn't mean that no changes are occurring any more
  // because the data load is triggered, but not necessarily already reflected inside the store
  async reInit(): Promise<void> {
    // localStorage check
    // This check happens before ANY profile initialization code runs
    const isProfilesEnabled =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('sp_user_profiles_enabled') === 'true';

    if (isProfilesEnabled) {
      // Only initialize profile system if explicitly enabled
      await this._userProfileService.initialize();
    }

    // Ensure legacy migration check is done (if applicable)
    await this._pfapiService.pf.wasDataMigratedInitiallyPromise;

    // Hydrate from Operation Log (which handles migration from legacy if needed)
    await this._operationLogHydratorService.hydrateStore();
  }

  /**
   * Re-initialize the app after a remote sync download.
   * This uses hydrateFromRemoteSync() which:
   * 1. Reads the synced data from 'pf' database
   * 2. Persists it to SUP_OPS as a SYNC_IMPORT operation
   * 3. Creates a snapshot for crash safety
   * 4. Updates NgRx with the synced data
   */
  async reInitFromRemoteSync(): Promise<void> {
    await this._operationLogHydratorService.hydrateFromRemoteSync();
  }
}

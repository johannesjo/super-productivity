import { inject, Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { mapTo, take } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { allDataWasLoaded } from '../../root-store/meta/all-data-was-loaded.actions';
import { loadAllData } from '../../root-store/meta/load-all-data.action';
import { DataRepairService } from '../data-repair/data-repair.service';
import { PfapiService } from '../../pfapi/pfapi.service';
import { CROSS_MODEL_VERSION } from '../../pfapi/pfapi-config';
import { DataInitStateService } from './data-init-state.service';

@Injectable({ providedIn: 'root' })
export class DataInitService {
  private _pfapiService = inject(PfapiService);
  private _store$ = inject<Store<any>>(Store);
  private _dataRepairService = inject(DataRepairService);
  private _dataInitStateService = inject(DataInitStateService);

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
  async reInit(isOmitTokens: boolean = false): Promise<void> {
    await this._pfapiService.pf.wasDataMigratedInitiallyPromise;
    const appDataComplete = await this._pfapiService.pf.getAllSyncModelData(true);
    const validationResult = this._pfapiService.pf.validate(appDataComplete);
    if (validationResult.success) {
      this._store$.dispatch(loadAllData({ appDataComplete, isOmitTokens }));
    } else {
      // DATA REPAIR CASE
      // ----------------
      if (this._dataRepairService.isRepairPossibleAndConfirmed(appDataComplete)) {
        const fixedData = this._pfapiService.pf.repairCompleteData(
          appDataComplete,
          validationResult.errors,
        );
        this._store$.dispatch(
          loadAllData({
            appDataComplete: fixedData,
            isOmitTokens,
          }),
        );
        const localCrossModelVersion =
          (await this._pfapiService.pf.metaModel.load()).crossModelVersion ||
          CROSS_MODEL_VERSION;

        await this._pfapiService.pf.importAllSycModelData({
          data: fixedData,
          crossModelVersion: localCrossModelVersion,
          // since we already did try
          isAttemptRepair: false,
        });
      }
      // TODO handle start fresh case
    }
  }
}

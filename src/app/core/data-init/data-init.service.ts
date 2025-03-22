import { inject, Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { mapTo, shareReplay, take } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { allDataWasLoaded } from '../../root-store/meta/all-data-was-loaded.actions';
import { loadAllData } from '../../root-store/meta/load-all-data.action';
import { DataRepairService } from '../data-repair/data-repair.service';
import { PfapiService } from '../../pfapi/pfapi.service';
import { CROSS_MODEL_VERSION } from '../../pfapi/pfapi-config';

@Injectable({ providedIn: 'root' })
export class DataInitService {
  private _pfapiService = inject(PfapiService);
  private _store$ = inject<Store<any>>(Store);
  private _dataRepairService = inject(DataRepairService);

  isAllDataLoadedInitially$: Observable<boolean> = from(this.reInit()).pipe(
    mapTo(true),
    take(1),
    // only ever load once
    shareReplay(1),
  );

  constructor() {
    // TODO better construction than this
    this.isAllDataLoadedInitially$.pipe(take(1)).subscribe(() => {
      // here because to avoid circular dependencies
      this._store$.dispatch(allDataWasLoaded());
    });
  }

  // NOTE: it's important to remember that this doesn't mean that no changes are occurring any more
  // because the data load is triggered, but not necessarily already reflected inside the store
  async reInit(isOmitTokens: boolean = false): Promise<void> {
    const appDataComplete = await this._pfapiService.getAllSyncModelData();
    const isValid = this._pfapiService.isValidateComplete(appDataComplete);
    if (isValid) {
      this._store$.dispatch(loadAllData({ appDataComplete, isOmitTokens }));
    } else {
      if (this._dataRepairService.isRepairPossibleAndConfirmed(appDataComplete)) {
        const fixedData = this._pfapiService.repairCompleteData(appDataComplete);
        this._store$.dispatch(
          loadAllData({
            appDataComplete: fixedData,
            isOmitTokens,
          }),
        );
        await this._pfapiService.importAllSycModelData(fixedData, CROSS_MODEL_VERSION);
      }
    }
  }
}

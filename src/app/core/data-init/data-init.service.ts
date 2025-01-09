import { Injectable, inject } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { filter, shareReplay, switchMap, take } from 'rxjs/operators';
import { ProjectService } from '../../features/project/project.service';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { Store } from '@ngrx/store';
import { allDataWasLoaded } from '../../root-store/meta/all-data-was-loaded.actions';
import { PersistenceService } from '../persistence/persistence.service';
import { loadAllData } from '../../root-store/meta/load-all-data.action';
import { isValidAppData } from '../../imex/sync/is-valid-app-data.util';
import { DataRepairService } from '../data-repair/data-repair.service';

@Injectable({ providedIn: 'root' })
export class DataInitService {
  private _persistenceService = inject(PersistenceService);
  private _projectService = inject(ProjectService);
  private _workContextService = inject(WorkContextService);
  private _store$ = inject<Store<any>>(Store);
  private _dataRepairService = inject(DataRepairService);

  isAllDataLoadedInitially$: Observable<boolean> = from(this.reInit()).pipe(
    switchMap(() => this._workContextService.isActiveWorkContextProject$),
    switchMap((isProject) =>
      isProject
        ? // NOTE: this probably won't work some of the time
          this._projectService.isRelatedDataLoadedForCurrentProject$
        : of(true),
    ),
    filter((isLoaded) => isLoaded),
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
    const appDataComplete = await this._persistenceService.loadComplete(true);
    const isValid = isValidAppData(appDataComplete);
    if (isValid) {
      this._store$.dispatch(loadAllData({ appDataComplete, isOmitTokens }));
    } else {
      if (this._dataRepairService.isRepairPossibleAndConfirmed(appDataComplete)) {
        const fixedData = this._dataRepairService.repairData(appDataComplete);
        this._store$.dispatch(
          loadAllData({
            appDataComplete: fixedData,
            isOmitTokens,
          }),
        );
        await this._persistenceService.importComplete(fixedData);
      }
    }
  }
}

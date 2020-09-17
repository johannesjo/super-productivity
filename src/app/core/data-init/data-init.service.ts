import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { concatMap, filter, shareReplay, switchMap, take } from 'rxjs/operators';
import { ProjectService } from '../../features/project/project.service';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { Store } from '@ngrx/store';
import { allDataWasLoaded } from '../../root-store/meta/all-data-was-loaded.actions';
import { PersistenceService } from '../persistence/persistence.service';
import { ProjectState } from '../../features/project/store/project.reducer';
import { MigrationService } from '../migration/migration.service';
import { loadAllData } from '../../root-store/meta/load-all-data.action';
import { environment } from '../../../environments/environment';
import { isValidAppData } from '../../imex/sync/is-valid-app-data.util';

@Injectable({providedIn: 'root'})
export class DataInitService {
  isAllDataLoadedInitially$: Observable<boolean> = from(this._persistenceService.project.loadState(true)).pipe(
    concatMap((projectState: ProjectState) => this._migrationService.migrateIfNecessaryToProjectState$(projectState)),
    concatMap(() => from(this.reInit())),
    switchMap(() => this._workContextService.isActiveWorkContextProject$),
    switchMap(isProject => isProject
      // NOTE: this probably won't work some of the time
      ? this._projectService.isRelatedDataLoadedForCurrentProject$
      : of(true)
    ),
    filter(isLoaded => isLoaded),
    take(1),
    // only ever load once
    shareReplay(1),
  );

  constructor(
    private _persistenceService: PersistenceService,
    private _migrationService: MigrationService,
    private _projectService: ProjectService,
    private _workContextService: WorkContextService,
    private _store$: Store<any>,
  ) {
    // TODO better construction than this
    this.isAllDataLoadedInitially$.pipe(
      take(1)
    ).subscribe(() => {
      // here because to avoid circular dependencies
      this._store$.dispatch(allDataWasLoaded());
    });
  }

  // NOTE: it's important to remember that this doesn't mean that no changes are occurring any more
  // because the data load is triggered, but not necessarily already reflected inside the store
  async reInit(isOmitTokens: boolean = false): Promise<void> {
    const appDataComplete = await this._persistenceService.loadComplete();
    if (!environment.production) {
      const isValid = isValidAppData(appDataComplete);
      console.log('isValidAppData', isValid);
    }
    this._store$.dispatch(loadAllData({appDataComplete, isOmitTokens}));
  }
}

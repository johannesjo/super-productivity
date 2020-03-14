import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {filter, map, tap, withLatestFrom} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import * as contextActions from './work-context.actions';
import {selectContextFeatureState} from './work-context.reducer';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {UnsetCurrentTask} from '../../tasks/store/task.actions';
import {TaskService} from '../../tasks/task.service';
import {BannerId} from '../../../core/banner/banner.model';
import {BannerService} from '../../../core/banner/banner.service';


@Injectable()
export class WorkContextEffects {
  // TODO improve
  updateContextsStorage$ = createEffect(() => this._actions$.pipe(
    ofType(
      contextActions.setActiveWorkContext,
    ),
    withLatestFrom(
      this._store$.pipe(select(selectContextFeatureState)),
    ),
    tap(this._saveToLs.bind(this)),
    tap(this._updateLastActive.bind(this)),
  ), {dispatch: false});


  dismissContextScopeBannersOnContextChange = createEffect(() => this._actions$
    .pipe(
      ofType(
        contextActions.setActiveWorkContext,
      ),
      tap(() => {
        this._bannerService.dismissIfExisting(BannerId.ForgotToFinishDay);
        this._bannerService.dismissIfExisting(BannerId.JiraUnblock);
      }),
    ), {dispatch: false});


  // EXTERNAL
  // --------
  unsetCurrentTask$ = createEffect(() => this._actions$.pipe(
    ofType(contextActions.setActiveWorkContext),
    withLatestFrom(this._taskService.isTaskDataLoaded$),
    filter(([, isDataLoaded]) => isDataLoaded),
    map(() => new UnsetCurrentTask()),
  ));


  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _taskService: TaskService,
    private _bannerService: BannerService,
  ) {
  }

  private _saveToLs([action, contextState]) {
    this._persistenceService.saveLastActive();
    this._persistenceService.context.saveState(contextState);
  }

  private _updateLastActive() {
    this._persistenceService.saveLastActive();
  }
}

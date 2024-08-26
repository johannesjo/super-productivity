import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, map, tap, withLatestFrom } from 'rxjs/operators';
import { setSelectedTask } from '../../tasks/store/task.actions';
import { TaskService } from '../../tasks/task.service';
import { BannerId } from '../../../core/banner/banner.model';
import { BannerService } from '../../../core/banner/banner.service';
import { Observable } from 'rxjs';
import { setActiveWorkContext } from './work-context.actions';

@Injectable()
export class WorkContextEffects {
  // TODO improve
  // updateContextsStorage$ = createEffect(() => this._actions$.pipe(
  //   ofType(
  //     setActiveWorkContext,
  //   ),
  //   withLatestFrom(
  //     this._store$.pipe(select(selectContextFeatureState)),
  //   ),
  //   tap(this._saveToLs.bind(this)),
  // ), {dispatch: false});

  dismissContextScopeBannersOnContextChange: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(setActiveWorkContext),
        tap(() => {
          this._bannerService.dismiss(BannerId.JiraUnblock);
        }),
      ),
    { dispatch: false },
  );

  // EXTERNAL
  // --------
  // unsetCurrentTask$ = createEffect(() => this._actions$.pipe(
  //   ofType(setActiveWorkContext),
  //   withLatestFrom(this._taskService.isTaskDataLoaded$),
  //   filter(([, isDataLoaded]) => isDataLoaded),
  //   map(() => new UnsetCurrentTask()),
  // ));

  unselectSelectedTask$: Observable<unknown> = createEffect(() =>
    this._actions$.pipe(
      ofType(setActiveWorkContext),
      withLatestFrom(this._taskService.isTaskDataLoaded$),
      filter(([, isDataLoaded]) => isDataLoaded),
      map(() => setSelectedTask({ id: null })),
    ),
  );

  constructor(
    private _actions$: Actions,
    private _taskService: TaskService,
    private _bannerService: BannerService,
  ) {}
}

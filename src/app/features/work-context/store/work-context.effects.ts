import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, map, tap, withLatestFrom, startWith } from 'rxjs/operators';
import { setSelectedTask } from '../../tasks/store/task.actions';
import { TaskService } from '../../tasks/task.service';
import { BannerId } from '../../../core/banner/banner.model';
import { BannerService } from '../../../core/banner/banner.service';
import { Observable } from 'rxjs';
import { setActiveWorkContext } from './work-context.actions';
import { NavigationEnd, Router } from '@angular/router';
import { TODAY_TAG } from '../../tag/tag.const';
import { WorkContextType } from '../work-context.model';
import { WorkContextService } from '../work-context.service';

@Injectable()
export class WorkContextEffects {
  private _actions$ = inject(Actions);
  private _taskService = inject(TaskService);
  private _bannerService = inject(BannerService);
  private _router = inject(Router);
  private _workContextService = inject(WorkContextService);

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

  unselectSelectedTask$: Observable<unknown> = createEffect(() =>
    this._actions$.pipe(
      ofType(setActiveWorkContext),
      withLatestFrom(this._taskService.isTaskDataLoaded$),
      filter(([, isDataLoaded]) => isDataLoaded),
      map(() => setSelectedTask({ id: null })),
    ),
  );

  switchToTodayContextOnSpecialRoutes$: Observable<unknown> = createEffect(() =>
    this._router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this._router.url), // Handle initial page load
      filter(
        (url) =>
          !!url.match(/(schedule)$/) ||
          !!url.match(/(planner)$/) ||
          !!url.match(/(boards)$/),
      ),
      withLatestFrom(this._workContextService.activeWorkContextTypeAndId$),
      filter(
        ([, currentContext]) =>
          !currentContext || currentContext.activeId !== TODAY_TAG.id,
      ),
      map(() =>
        setActiveWorkContext({
          activeId: TODAY_TAG.id,
          activeType: WorkContextType.TAG,
        }),
      ),
    ),
  );
}

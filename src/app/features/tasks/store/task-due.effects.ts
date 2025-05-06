import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, skip, switchMap } from 'rxjs/operators';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { merge } from 'rxjs';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { removeTasksFromTodayTag } from '../../tag/store/tag.actions';
import { Store } from '@ngrx/store';
import { selectOverdueTasks } from './task.selectors';

@Injectable()
export class TaskDueEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject(Store);
  private _globalTrackingIntervalService = inject(GlobalTrackingIntervalService);

  removeOverdueFormToday$ = createEffect(() => {
    return merge(
      this._globalTrackingIntervalService.todayDateStr$.pipe(skip(1)),
      this._actions$.pipe(ofType(loadAllData)),
    ).pipe(
      switchMap(() => this._store$.select(selectOverdueTasks)),
      map((overdue) => removeTasksFromTodayTag({ taskIds: overdue.map((t) => t.id) })),
    );
  });
}

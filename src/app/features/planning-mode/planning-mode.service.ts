import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, merge, Observable, of, Subject } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  shareReplay,
  withLatestFrom,
} from 'rxjs/operators';
import { WorkContextService } from '../work-context/work-context.service';
import { TaskService } from '../tasks/task.service';
import { selectOverdueTasksWithSubTasks } from '../tasks/store/task.selectors';
import { Store } from '@ngrx/store';

const NO_PLANNING_MODE_HOUR = 15;

@Injectable({ providedIn: 'root' })
export class PlanningModeService {
  private _workContextService = inject(WorkContextService);
  private _taskService = inject(TaskService);
  private _store = inject(Store);

  private _iPlanningModeEndedUser$: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);
  private _manualTriggerCheck$ = new Subject<unknown>();
  private _isCurrentTask$: Observable<unknown> = this._taskService.currentTaskId$.pipe(
    distinctUntilChanged(),
    filter((id) => !!id),
  );
  private _triggerCheck$: Observable<unknown> = merge(
    this._manualTriggerCheck$.pipe(mapTo('MANUAL_TRIGGER')),
    this._isCurrentTask$,
    this._workContextService.onWorkContextChange$,
    of('INIT'),
  );

  isPlanningMode$: Observable<boolean> = this._triggerCheck$.pipe(
    withLatestFrom(
      this._workContextService.isHasTasksToWorkOn$,
      this._iPlanningModeEndedUser$,
      this._store.select(selectOverdueTasksWithSubTasks),
    ),

    map(([t, isHasTasksToWorkOn, isPlanningEndedByUser, overdueTasks]) => {
      if (t !== 'MANUAL_TRIGGER' && new Date().getHours() >= NO_PLANNING_MODE_HOUR) {
        return false;
      }
      return !isHasTasksToWorkOn && !isPlanningEndedByUser && !overdueTasks.length;
    }),
    shareReplay(1),
  );

  constructor() {
    this.reCheckPlanningMode();
  }

  leavePlanningMode(): void {
    this._iPlanningModeEndedUser$.next(true);
    this.reCheckPlanningMode();
  }

  enterPlanningMode(): void {
    this._iPlanningModeEndedUser$.next(false);
    this.reCheckPlanningMode();
  }

  reCheckPlanningMode(): void {
    this._manualTriggerCheck$.next(true);
  }
}

import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, merge, Observable } from 'rxjs';
import { delay, distinctUntilChanged, filter, map, withLatestFrom } from 'rxjs/operators';
import { WorkContextService } from '../work-context/work-context.service';
import { TaskService } from '../tasks/task.service';

@Injectable({ providedIn: 'root' })
export class PlanningModeService {
  private _workContextService = inject(WorkContextService);
  private _taskService = inject(TaskService);

  private _iPlanningModeEndedUser$: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);
  private _manualTriggerCheck$: BehaviorSubject<unknown> = new BehaviorSubject<unknown>(
    null,
  );
  private _isCurrentTask$: Observable<unknown> = this._taskService.currentTaskId$.pipe(
    distinctUntilChanged(),
    filter((id) => !!id),
  );
  private _triggerCheck$: Observable<unknown> = merge(
    this._manualTriggerCheck$,
    this._isCurrentTask$,
    // TODO fix hacky way of waiting for data to be loaded
    this._workContextService.onWorkContextChange$.pipe(delay(100)),
  );

  isPlanningMode$: Observable<boolean> = this._triggerCheck$.pipe(
    withLatestFrom(
      this._workContextService.isHasTasksToWorkOn$,
      this._iPlanningModeEndedUser$,
    ),
    map(
      ([t, isHasTasksToWorkOn, isPlanningEndedByUser]) =>
        !isHasTasksToWorkOn && !isPlanningEndedByUser,
    ),
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

import { Injectable } from '@angular/core';
import { BehaviorSubject, merge, Observable } from 'rxjs';
import { delay, map, withLatestFrom } from 'rxjs/operators';
import { WorkContextService } from '../work-context/work-context.service';

@Injectable({providedIn: 'root'})
export class PlanningModeService {
  private _iPlanningModeEndedUser$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _manualTriggerCheck$: BehaviorSubject<unknown> = new BehaviorSubject<unknown>(null);
  private _triggerCheck$: Observable<unknown> = merge(
    this._manualTriggerCheck$,
    // TODO fix hacky way of waiting for data to be loaded
    this._workContextService.onWorkContextChange$.pipe(delay(100))
  );

  isPlanningMode$: Observable<boolean> = this._triggerCheck$.pipe(
    withLatestFrom(
      this._workContextService.isHasTasksToWorkOn$,
      this._iPlanningModeEndedUser$,
    ),
    map(([t, isHasTasksToWorkOn, isPlanningEndedByUser]) => !isHasTasksToWorkOn && !isPlanningEndedByUser),
  );

  constructor(
    private _workContextService: WorkContextService,
  ) {
    this.reCheckPlanningMode();
  }

  leavePlanningMode() {
    this._iPlanningModeEndedUser$.next(true);
    this.reCheckPlanningMode();
  }

  enterPlanningMode() {
    this._iPlanningModeEndedUser$.next(false);
    this.reCheckPlanningMode();
  }

  reCheckPlanningMode() {
    this._manualTriggerCheck$.next(true);
  }
}

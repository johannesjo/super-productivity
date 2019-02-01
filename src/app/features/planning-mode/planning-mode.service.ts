import { Injectable } from '@angular/core';
import { BehaviorSubject } from "rxjs";
import { Observable } from "rxjs";
import { combineLatest } from "rxjs";
import { TaskService } from "../tasks/task.service";
import { map } from "rxjs/operators";
import { tap } from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class PlanningModeService {
  private _iPlanningModeEndedUser$ = new BehaviorSubject(false);

  isPlanningMode$: Observable<boolean> = combineLatest(
    this._taskService.isHasTasksToWorkOn$,
    this._iPlanningModeEndedUser$,
  ).pipe(
    tap(v => console.log(v)),
    map(([isHasTasksToWorkOn, isPlanningEndedByUser]) => !isHasTasksToWorkOn || !isPlanningEndedByUser),
  );

  constructor(
    private _taskService: TaskService,
  ) {
    this.isPlanningMode$.subscribe((v) => console.log('isPlanningMode$', v));
  }


  leavePlanningMode() {
    this._iPlanningModeEndedUser$.next(true);
  }
}

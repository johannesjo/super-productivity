import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { WorkContextService } from '../work-context/work-context.service';
import { TaskService } from '../tasks/task.service';
import { selectOverdueTasksWithSubTasks } from '../tasks/store/task.selectors';
import { Store } from '@ngrx/store';
import { TaskWithSubTasks } from '../tasks/task.model';

const NO_PLANNING_MODE_HOUR = 15;

@Injectable({ providedIn: 'root' })
export class PlanningModeService {
  private _workContextService = inject(WorkContextService);
  private _taskService = inject(TaskService);
  private _store = inject(Store);

  private _isPlanningModeEndedByUser = signal<boolean>(false);
  private _manualRecheckCounter = signal(0);
  private _ignoreHourLimitOnce = signal(false);

  private _workContextChangeTick = toSignal(
    this._workContextService.onWorkContextChange$.pipe(map(() => Date.now())),
    { initialValue: Date.now() },
  );

  private _hasTasksToWorkOn = toSignal(this._workContextService.isHasTasksToWorkOn$, {
    initialValue: false,
  });

  private _overdueTasks = toSignal(this._store.select(selectOverdueTasksWithSubTasks), {
    initialValue: [] as TaskWithSubTasks[],
  });

  private _isPlanningModeComputed = computed(() => {
    const ignoreHourLimit = this._ignoreHourLimitOnce();
    this._manualRecheckCounter();
    void this._taskService.currentTaskId();
    this._workContextChangeTick();

    const hasTasksToWorkOn = this._hasTasksToWorkOn();
    const isPlanningEndedByUser = this._isPlanningModeEndedByUser();
    const overdueTasks = this._overdueTasks();

    const isPastCutoff = new Date().getHours() >= NO_PLANNING_MODE_HOUR;
    if (!ignoreHourLimit && isPastCutoff) {
      return false;
    }

    return !hasTasksToWorkOn && !isPlanningEndedByUser && overdueTasks.length === 0;
  });

  isPlanningMode = this._isPlanningModeComputed;

  constructor() {
    this.reCheckPlanningMode();
  }

  leavePlanningMode(): void {
    this._isPlanningModeEndedByUser.set(true);
    this.reCheckPlanningMode();
  }

  enterPlanningMode(): void {
    this._isPlanningModeEndedByUser.set(false);
    this.reCheckPlanningMode();
  }

  reCheckPlanningMode(ignoreHourLimit = true): void {
    if (ignoreHourLimit) {
      this._ignoreHourLimitOnce.set(true);
      Promise.resolve().then(() => {
        this._ignoreHourLimitOnce.set(false);
      });
    }

    this._manualRecheckCounter.update((value) => value + 1);
  }
}

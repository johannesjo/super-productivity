import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { WorkContextService } from '../work-context/work-context.service';
import { TaskService } from '../tasks/task.service';

const NO_PLANNING_MODE_HOUR = 15;

@Injectable({ providedIn: 'root' })
export class PlanningModeService {
  private _workContextService = inject(WorkContextService);
  private _taskService = inject(TaskService);
  private _manualPlanningMode = signal(false);
  private _userHasChosenToLeave = signal(false);
  private _manualRecheckCounter = signal(0);

  private _workContextChangeTick = toSignal(
    this._workContextService.onWorkContextChange$.pipe(map(() => Date.now())),
    { initialValue: Date.now() },
  );

  private _hasTasksToWorkOn = toSignal(this._workContextService.isHasTasksToWorkOn$, {
    initialValue: false,
  });

  // Planning mode stays on if the user explicitly requested it or, otherwise,
  // only while the current context is empty before the daily cutoff hour.
  // However, if the user has explicitly chosen to leave, respect that choice.
  private _isPlanningModeComputed = computed(() => {
    this._manualRecheckCounter();
    void this._taskService.currentTaskId();
    this._workContextChangeTick();

    const manualPlanningMode = this._manualPlanningMode();
    const userHasChosenToLeave = this._userHasChosenToLeave();
    const hasTasksToWorkOn = this._hasTasksToWorkOn();
    const isPastCutoff = new Date().getHours() > NO_PLANNING_MODE_HOUR;

    if (manualPlanningMode) {
      return true;
    }

    // If user has explicitly chosen to leave planning mode, respect that choice
    if (userHasChosenToLeave) {
      return false;
    }

    return !hasTasksToWorkOn && !isPastCutoff;
  });

  isPlanningMode = this._isPlanningModeComputed;

  constructor() {
    this.reCheckPlanningMode();

    // Reset user choice when work context changes
    this._workContextService.onWorkContextChange$.subscribe(() => {
      this._userHasChosenToLeave.set(false);
    });
  }

  leavePlanningMode(): void {
    this._manualPlanningMode.set(false);
    this._userHasChosenToLeave.set(true);
    this.reCheckPlanningMode();
  }

  enterPlanningMode(): void {
    this._manualPlanningMode.set(true);
    this._userHasChosenToLeave.set(false);
    this.reCheckPlanningMode();
  }

  reCheckPlanningMode(): void {
    this._manualRecheckCounter.update((value) => value + 1);
  }
}

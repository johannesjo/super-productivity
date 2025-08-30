import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
} from '@angular/core';
import { Task } from '../../tasks/task.model';
import { TaskService } from '../../tasks/task.service';
import { Store } from '@ngrx/store';
import {
  focusSessionDone,
  goToMainScreen,
  selectFocusDuration,
  setFocusSessionDuration,
  startFocusPreparation,
  startFocusSession,
} from '../store/focus-mode.actions';
import { T } from 'src/app/t.const';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { SelectTaskComponent } from '../../tasks/select-task/select-task.component';
import { FocusModeService } from '../focus-mode.service';
import { FocusModeStrategyFactory } from '../focus-mode-strategies';
import { FocusModePhaseType } from '../focus-mode.model';
import { MatIcon } from '@angular/material/icon';
import { MsToMinuteClockStringPipe } from '../../../ui/duration/ms-to-minute-clock-string.pipe';
import { ProgressCircleComponent } from '../../../ui/progress-circle/progress-circle.component';
import { BreathingDotComponent } from '../../../ui/breathing-dot/breathing-dot.component';

@Component({
  selector: 'focus-mode-task-selection',
  templateUrl: './focus-mode-task-selection.component.html',
  styleUrls: ['./focus-mode-task-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButton,
    TranslatePipe,
    SelectTaskComponent,
    MatIcon,
    MsToMinuteClockStringPipe,
    ProgressCircleComponent,
    BreathingDotComponent,
  ],
})
export class FocusModeTaskSelectionComponent implements AfterViewInit, OnDestroy {
  readonly taskService = inject(TaskService);
  private readonly _store = inject(Store);
  private readonly _focusModeService = inject(FocusModeService);
  private readonly _strategyFactory = inject(FocusModeStrategyFactory);

  // Expose service for template
  focusModeService = this._focusModeService;

  mode = this._focusModeService.mode;
  cfg = this._focusModeService.cfg;
  pomodoroCfg = this._focusModeService.pomodoroCfg;
  currentCycle = this._focusModeService.currentCycle;
  isFocusSessionRunning = this._focusModeService.isSessionRunning;

  // Timer-related properties
  timeElapsed = this._focusModeService.timeElapsed;
  sessionProgress$ = this._focusModeService.sessionProgress$;
  timeToGo$ = this._focusModeService.timeToGo$;

  selectedTask: string | Task | undefined;
  initialTask = this.taskService.firstStartableTask;
  focusTimeout = 0;
  T: typeof T = T;

  isCountTimeDown = this._focusModeService.isCountTimeDown;

  ngAfterViewInit(): void {
    this.focusTimeout = window.setTimeout(() => {
      const el = document.querySelector('input');
      (el as HTMLElement).focus();
      (el as any).select();
    }, 200);
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.focusTimeout);
  }

  onTaskChange(taskOrNewTask: Task | string): void {
    this.selectedTask = taskOrNewTask;
  }

  completeSession(): void {
    this._store.dispatch(focusSessionDone());
  }

  onSubmit($event: SubmitEvent): void {
    $event.preventDefault();
    if (!this.selectedTask) return;

    const mode = this.mode();
    const skipPreparation = this.cfg()?.isSkipPreparation;

    if (!mode) return;

    // Set task
    if (typeof this.selectedTask === 'string') {
      const taskId = this.taskService.add(this.selectedTask);
      this.taskService.setCurrentId(taskId);
    } else {
      this.taskService.setCurrentId(this.selectedTask.id);
    }

    if (this.isFocusSessionRunning()) {
      this._store.dispatch(goToMainScreen());
      return;
    }

    // Get next phase from strategy
    const strategy = this._strategyFactory.getStrategy(mode);
    const nextPhase = strategy.getNextPhaseAfterTaskSelection(!!skipPreparation);

    // Set duration if provided by strategy
    if (nextPhase.duration !== undefined) {
      this._store.dispatch(
        setFocusSessionDuration({ focusSessionDuration: nextPhase.duration }),
      );
    }

    // Dispatch appropriate action based on strategy's decision
    switch (nextPhase.phase) {
      case FocusModePhaseType.DurationSelection:
        this._store.dispatch(selectFocusDuration());
        break;
      case FocusModePhaseType.Preparation:
        this._store.dispatch(startFocusPreparation());
        break;
      case FocusModePhaseType.Session:
        this._store.dispatch(
          startFocusSession(nextPhase.duration ? { duration: nextPhase.duration } : {}),
        );
        break;
    }
  }
}

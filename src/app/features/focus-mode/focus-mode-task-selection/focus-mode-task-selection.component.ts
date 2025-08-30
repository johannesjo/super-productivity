import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
} from '@angular/core';
import { Task } from '../../tasks/task.model';
import { TaskService } from '../../tasks/task.service';
import { Store } from '@ngrx/store';
import {
  focusSessionDone,
  selectFocusDuration,
  setFocusSessionDuration,
  startFocusPreparation,
  startFocusSession,
} from '../store/focus-mode.actions';
import { FocusModeMode } from '../focus-mode.const';
import { T } from 'src/app/t.const';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { SelectTaskComponent } from '../../tasks/select-task/select-task.component';
import { FocusModeService } from '../focus-mode.service';
import { MatIcon } from '@angular/material/icon';
import { MsToMinuteClockStringPipe } from '../../../ui/duration/ms-to-minute-clock-string.pipe';
import { ProgressCircleComponent } from '../../../ui/progress-circle/progress-circle.component';
import { BreathingDotComponent } from '../../../ui/breathing-dot/breathing-dot.component';
import { AsyncPipe } from '@angular/common';

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
    AsyncPipe,
  ],
})
export class FocusModeTaskSelectionComponent implements AfterViewInit, OnDestroy {
  readonly taskService = inject(TaskService);
  private readonly _store = inject(Store);
  private readonly _focusModeService = inject(FocusModeService);

  mode = this._focusModeService.mode;
  cfg = this._focusModeService.cfg;
  pomodoroCfg = this._focusModeService.pomodoroCfg;
  currentCycle = this._focusModeService.currentCycle;
  isFocusSessionRunning = this._focusModeService.isFocusSessionRunning;

  // Timer-related properties
  timeElapsed = this._focusModeService.timeElapsed;
  sessionProgress$ = this._focusModeService.sessionProgress$;
  timeToGo$ = this._focusModeService.timeToGo$;

  selectedTask: string | Task | undefined;
  initialTask = this.taskService.firstStartableTask;
  focusTimeout = 0;
  T: typeof T = T;

  isCountTimeDown = computed(() => {
    const mode = this.mode();
    return mode === FocusModeMode.Countdown || mode === FocusModeMode.Pomodoro;
  });

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

    // Set task
    if (typeof this.selectedTask === 'string') {
      const taskId = this.taskService.add(this.selectedTask);
      this.taskService.setCurrentId(taskId);
    } else {
      this.taskService.setCurrentId(this.selectedTask.id);
    }

    // Trigger next phase based on mode
    if (mode === FocusModeMode.Pomodoro) {
      // Set duration from config and skip duration selection
      // TODO revert
      // const duration = this.pomodoroCfg()?.duration || 25 * 60 * 1000;
      const duration = 4000;
      this._store.dispatch(setFocusSessionDuration({ focusSessionDuration: duration }));

      if (skipPreparation) {
        this._store.dispatch(startFocusSession({ duration }));
      } else {
        this._store.dispatch(startFocusPreparation());
      }
    } else if (mode === FocusModeMode.Flowtime) {
      if (skipPreparation) {
        this._store.dispatch(startFocusSession({}));
      } else {
        this._store.dispatch(startFocusPreparation());
      }
    } else {
      // Countdown mode always uses duration selection
      this._store.dispatch(selectFocusDuration());
    }
  }
}

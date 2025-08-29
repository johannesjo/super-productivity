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
  setFocusSessionActivePage,
  startFocusSession,
} from '../store/focus-mode.actions';
import { FocusModeMode, FocusModePage } from '../focus-mode.const';
import { T } from 'src/app/t.const';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { SelectTaskComponent } from '../../tasks/select-task/select-task.component';
import { selectFocusModeMode } from '../store/focus-mode.selectors';
import { toSignal } from '@angular/core/rxjs-interop';
import { selectFocusModeConfig } from '../../config/store/global-config.reducer';
import { GlobalConfigService } from '../../config/global-config.service';
import { setFocusSessionDuration } from '../store/focus-mode.actions';

@Component({
  selector: 'focus-mode-task-selection',
  templateUrl: './focus-mode-task-selection.component.html',
  styleUrls: ['./focus-mode-task-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButton, TranslatePipe, SelectTaskComponent],
})
export class FocusModeTaskSelectionComponent implements AfterViewInit, OnDestroy {
  readonly taskService = inject(TaskService);
  private readonly _store = inject(Store);
  private readonly _globalConfigService = inject(GlobalConfigService);

  mode = toSignal(this._store.select(selectFocusModeMode));
  cfg = toSignal(this._store.select(selectFocusModeConfig));
  pomodoroConfig = toSignal(this._globalConfigService.pomodoroConfig$);

  selectedTask: string | Task | undefined;
  initialTask = this.taskService.firstStartableTask;
  focusTimeout = 0;
  T: typeof T = T;

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

    // Determine next page based on mode
    let nextPage: FocusModePage;

    if (mode === FocusModeMode.Pomodoro) {
      // Set duration from config and skip duration selection
      const duration = this.pomodoroConfig()?.duration || 25 * 60 * 1000;
      this._store.dispatch(setFocusSessionDuration({ focusSessionDuration: duration }));
      nextPage = skipPreparation ? FocusModePage.Main : FocusModePage.Preparation;
    } else if (mode === FocusModeMode.Flowtime) {
      nextPage = skipPreparation ? FocusModePage.Main : FocusModePage.Preparation;
    } else {
      // Countdown mode uses always duration selection
      nextPage = FocusModePage.DurationSelection;
    }

    this._store.dispatch(setFocusSessionActivePage({ focusActivePage: nextPage }));

    if (nextPage === FocusModePage.Main) {
      this._store.dispatch(startFocusSession());
    }
  }
}

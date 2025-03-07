import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
} from '@angular/core';
import { Task } from '../../tasks/task.model';
import { TaskService } from '../../tasks/task.service';
import { first } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import {
  setFocusSessionActivePage,
  startFocusSession,
} from '../store/focus-mode.actions';
import { FocusModeMode, FocusModePage } from '../focus-mode.const';
import { T } from 'src/app/t.const';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { SelectTaskComponent } from '../../tasks/select-task/select-task.component';
import { selectFocusModeMode } from '../store/focus-mode.selectors';
import { toSignal } from '@angular/core/rxjs-interop';
import { selectFocusModeConfig } from '../../config/store/global-config.reducer';

@Component({
  selector: 'focus-mode-task-selection',
  templateUrl: './focus-mode-task-selection.component.html',
  styleUrls: ['./focus-mode-task-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButton, AsyncPipe, TranslatePipe, SelectTaskComponent],
})
export class FocusModeTaskSelectionComponent implements AfterViewInit, OnDestroy {
  readonly taskService = inject(TaskService);
  private readonly _store = inject(Store);

  mode = toSignal(this._store.select(selectFocusModeMode));
  cfg = toSignal(this._store.select(selectFocusModeConfig));

  selectedTask: string | Task | undefined;
  initialTask$ = this.taskService.firstStartableTask$.pipe(first());
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
    if (this.selectedTask) {
      const focusActivePage =
        this.mode() === FocusModeMode.Flowtime
          ? this.cfg()?.isSkipPreparation
            ? FocusModePage.Main
            : FocusModePage.Preparation
          : FocusModePage.DurationSelection;

      if (typeof this.selectedTask === 'string') {
        const taskId = this.taskService.add(this.selectedTask);
        this.taskService.setCurrentId(taskId);
        this._store.dispatch(setFocusSessionActivePage({ focusActivePage }));
      } else {
        this.taskService.setCurrentId(this.selectedTask.id);
        this._store.dispatch(setFocusSessionActivePage({ focusActivePage }));
      }

      if (focusActivePage === FocusModePage.Main) {
        this._store.dispatch(startFocusSession());
      }
    }
  }
}

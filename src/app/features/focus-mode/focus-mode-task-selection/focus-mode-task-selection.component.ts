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
import { setFocusSessionActivePage } from '../store/focus-mode.actions';
import { FocusModePage } from '../focus-mode.const';
import { T } from 'src/app/t.const';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { SelectTaskComponent } from '../../tasks/select-task/select-task.component';

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
    console.log('task selected', this.selectedTask);

    $event.preventDefault();
    if (this.selectedTask) {
      if (typeof this.selectedTask === 'string') {
        const taskId = this.taskService.add(this.selectedTask);
        this.taskService.setCurrentId(taskId);
        this._store.dispatch(
          setFocusSessionActivePage({ focusActivePage: FocusModePage.DurationSelection }),
        );
      } else {
        this.taskService.setCurrentId(this.selectedTask.id);
        this._store.dispatch(
          setFocusSessionActivePage({ focusActivePage: FocusModePage.DurationSelection }),
        );
      }
    }
  }
}

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
} from '@angular/core';
import { Task } from '../../tasks/task.model';
import { TaskService } from '../../tasks/task.service';
import { first } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { setFocusSessionActivePage } from '../store/focus-mode.actions';
import { FocusModePage } from '../focus-mode.const';
import { T } from 'src/app/t.const';

@Component({
  selector: 'focus-mode-task-selection',
  templateUrl: './focus-mode-task-selection.component.html',
  styleUrls: ['./focus-mode-task-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusModeTaskSelectionComponent implements AfterViewInit, OnDestroy {
  selectedTask: string | Task | undefined;
  initialTask$ = this.taskService.firstStartableTask$.pipe(first());
  focusTimeout = 0;
  T: typeof T = T;

  constructor(public readonly taskService: TaskService, private readonly _store: Store) {}

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
        this._store.dispatch(
          setFocusSessionActivePage({ focusActivePage: FocusModePage.DurationSelection }),
        );
      }
    }
  }
}

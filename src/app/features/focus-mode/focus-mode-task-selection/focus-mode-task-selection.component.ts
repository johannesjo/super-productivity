import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnDestroy,
  Output,
} from '@angular/core';
import { Task } from '../../tasks/task.model';
import { TaskService } from '../../tasks/task.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'focus-mode-task-selection',
  templateUrl: './focus-mode-task-selection.component.html',
  styleUrls: ['./focus-mode-task-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusModeTaskSelectionComponent implements AfterViewInit, OnDestroy {
  @Output() taskSelected: EventEmitter<string | Task> = new EventEmitter();

  selectedTask: string | Task | undefined;
  initialTask$ = this.taskService.firstStartableTask$.pipe(first());
  focusTimeout = 0;

  constructor(public readonly taskService: TaskService) {}

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
      this.taskSelected.emit(this.selectedTask);
    }
  }
}

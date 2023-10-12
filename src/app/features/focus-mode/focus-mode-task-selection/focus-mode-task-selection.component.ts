import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Task } from '../../tasks/task.model';

@Component({
  selector: 'focus-mode-task-selection',
  templateUrl: './focus-mode-task-selection.component.html',
  styleUrls: ['./focus-mode-task-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusModeTaskSelectionComponent {
  @Input() focusModeDuration = 25 * 60 * 1000;
  @Output() taskSelected: EventEmitter<string | Task> = new EventEmitter();
  @Output() focusModeDurationChanged: EventEmitter<number> = new EventEmitter();

  selectedTask: string | Task | undefined;

  constructor() {}

  onTaskChange(taskOrNewTask: Task | string): void {
    console.log(taskOrNewTask);
    this.selectedTask = taskOrNewTask;
  }

  onFocusModeDurationChanged(duration: number): void {
    this.focusModeDuration = duration;
    this.focusModeDurationChanged.emit(duration);
  }

  onSubmit($event: SubmitEvent): void {
    console.log('task selected', this.selectedTask);

    $event.preventDefault();
    if (this.selectedTask) {
      this.taskSelected.emit(this.selectedTask);
    }
  }
}

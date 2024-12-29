import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TaskService } from '../../tasks/task.service';
import { Observable } from 'rxjs';
import { Task } from '../../tasks/task.model';
import { T } from '../../../t.const';

@Component({
  selector: 'dialog-tracking-reminder',
  templateUrl: './dialog-tracking-reminder.component.html',
  styleUrls: ['./dialog-tracking-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class DialogTrackingReminderComponent implements OnInit {
  private _taskService = inject(TaskService);
  private _matDialogRef =
    inject<MatDialogRef<DialogTrackingReminderComponent>>(MatDialogRef);
  data = inject(MAT_DIALOG_DATA);

  T: typeof T = T;
  lastCurrentTask$: Observable<Task> = this._taskService.getByIdOnce$(
    this.data.lastCurrentTaskId,
  );
  selectedTask: Task | null = null;
  newTaskTitle?: string;
  isCreate?: boolean;

  constructor() {
    const _matDialogRef = this._matDialogRef;

    _matDialogRef.disableClose = true;
  }

  ngOnInit(): void {
    this.lastCurrentTask$.subscribe((task) => {
      this.selectedTask = task;
      this.isCreate = false;
    });
  }

  onTaskChange(taskOrTaskTitle: Task | string): void {
    this.isCreate = typeof taskOrTaskTitle === 'string';
    if (this.isCreate) {
      this.newTaskTitle = taskOrTaskTitle as string;
      this.selectedTask = null;
    } else {
      this.selectedTask = taskOrTaskTitle as Task;
      this.newTaskTitle = undefined;
    }
  }

  cancel(): void {
    this._matDialogRef.close();
  }

  track(): void {
    this._matDialogRef.close({
      task: this.selectedTask || this.newTaskTitle,
    });
  }
}

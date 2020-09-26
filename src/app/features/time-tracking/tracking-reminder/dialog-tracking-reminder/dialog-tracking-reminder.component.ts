import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TaskService } from '../../../tasks/task.service';
import { Observable } from 'rxjs';
import { Task } from '../../../tasks/task.model';
import { T } from '../../../../t.const';

@Component({
  selector: 'dialog-tracking-reminder',
  templateUrl: './dialog-tracking-reminder.component.html',
  styleUrls: ['./dialog-tracking-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogTrackingReminderComponent implements OnInit {
  T: typeof T = T;
  lastCurrentTask$: Observable<Task> = this._taskService.getByIdOnce$(this.data.lastCurrentTaskId);
  selectedTask: Task | null = null;
  newTaskTitle?: string;
  isCreate?: boolean;

  constructor(
    private _taskService: TaskService,
    private _matDialogRef: MatDialogRef<DialogTrackingReminderComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    _matDialogRef.disableClose = true;
  }

  ngOnInit() {
    this.lastCurrentTask$.subscribe((task) => {
      this.selectedTask = task;
      this.isCreate = false;
    });
  }

  onTaskChange(taskOrTaskTitle: Task | string) {
    this.isCreate = (typeof taskOrTaskTitle === 'string');
    if (this.isCreate) {
      this.newTaskTitle = taskOrTaskTitle as string;
      this.selectedTask = null;
    } else {
      this.selectedTask = taskOrTaskTitle as Task;
      this.newTaskTitle = undefined;
    }
  }

  cancel() {
    this._matDialogRef.close();
  }

  track() {
    this._matDialogRef.close({
      task: this.selectedTask || this.newTaskTitle,
    });
  }
}

import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { TaskService } from '../../tasks/task.service';
import { Observable } from 'rxjs';
import { Task } from '../../tasks/task.model';
import { T } from '../../../t.const';
import { FormsModule } from '@angular/forms';
import { SelectTaskComponent } from '../../tasks/select-task/select-task.component';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AsyncPipe } from '@angular/common';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'dialog-tracking-reminder',
  templateUrl: './dialog-tracking-reminder.component.html',
  styleUrls: ['./dialog-tracking-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatDialogContent,
    SelectTaskComponent,
    MatDialogActions,
    MatButton,
    MatIcon,
    AsyncPipe,
    MsToStringPipe,
    TranslatePipe,
  ],
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

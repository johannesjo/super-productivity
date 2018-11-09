import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { TaskService } from '../../tasks/task.service';
import { Observable } from 'rxjs';
import { Task } from '../../tasks/task.model';

@Component({
  selector: 'dialog-idle',
  templateUrl: './dialog-idle.component.html',
  styleUrls: ['./dialog-idle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogIdleComponent implements OnInit {
  public lastCurrentTask$: Observable<Task> = this._taskService.getById(this.data.lastCurrentTaskId);
  public selectedTask: Task | string;

  constructor(
    private _taskService: TaskService,
    private _matDialogRef: MatDialogRef<DialogIdleComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    _matDialogRef.disableClose = true;
  }

  ngOnInit() {
    this.lastCurrentTask$.subscribe((task) => this.selectedTask = task);
  }

  close() {
    this._matDialogRef.close(null);
  }

  track() {
    this._matDialogRef.close(this.selectedTask);
  }


  trackButResetBreakTimer() {
    this._matDialogRef.close(this.data.lastCurrentTaskId);
  }
}

import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material';
import { TaskCopy } from '../../tasks/task.model';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { TaskService } from '../../tasks/task.service';
import { Router } from '@angular/router';
import { WorklogDay } from '../map-archive-to-worklog';

@Component({
  selector: 'dialog-task-summary',
  templateUrl: './dialog-task-summary.component.html',
  styleUrls: ['./dialog-task-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogTaskSummaryComponent implements OnInit {
  worklogForDay: { key: string; value: WorklogDay } = this.data.worklogForDay;

  constructor(
    private readonly _taskService: TaskService,
    private readonly _matDialogRef: MatDialogRef<DialogTaskSummaryComponent>,
    private readonly _router: Router,
    private readonly _matDialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: { worklogForDay: { key: string; value: WorklogDay } },
  ) {
    console.log(this.data);
  }

  ngOnInit() {
  }

  restoreTask(dayKey, task: TaskCopy) {
    this._matDialog.open(DialogConfirmComponent, {
      restoreFocus: true,
      data: {
        okTxt: 'Do it!',
        message: `Are you sure you want to move the task <strong>"${task.title}"</strong> into your todays task list?`,
      }
    }).afterClosed()
      .subscribe((isConfirm: boolean) => {
        if (isConfirm) {
          // TODO check if this works and maybe refactor to worklog
          // const worklogDay: WorklogDay = this.worklog[yearKey].ent[monthKey].ent[dayKey];
          // const index = worklogDay.logEntries.findIndex(ent => ent.task === task);
          // if (index > -1) {
          // TODO check if this works
          // TODO refactor to task action!!!
          // worklogDay.logEntries.splice(index, 1);
          // this.worklog = {...this.worklog};

          this._taskService.restoreTask(task);
          this._router.navigate(['/work-view']);
          // }
        }
      });
  }

  close() {
    this._matDialogRef.close();
  }
}

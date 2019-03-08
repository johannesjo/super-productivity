import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { ProjectService } from '../project/project.service';
import { expandFadeAnimation } from '../../ui/animations/expand.ani';
import { WorklogMonth } from './map-archive-to-worklog';
import { MatDialog } from '@angular/material';
import { TaskCopy } from '../tasks/task.model';
import { TaskService } from '../tasks/task.service';
import { WeeksInMonth } from '../../util/get-weeks-in-month';
import { DialogWorklogExportComponent } from './dialog-worklog-export/dialog-worklog-export.component';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { Router } from '@angular/router';
import { standardListAnimation } from '../../ui/animations/standard-list.ani';
import { WorklogService } from './worklog.service';

@Component({
  selector: 'worklog',
  templateUrl: './worklog.component.html',
  styleUrls: ['./worklog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation, standardListAnimation]
})
export class WorklogComponent {
  constructor(
    public readonly worklogService: WorklogService,
    private readonly _persistenceService: PersistenceService,
    private readonly _projectService: ProjectService,
    private readonly _taskService: TaskService,
    private readonly _matDialog: MatDialog,
    private readonly _cd: ChangeDetectorRef,
    private readonly _router: Router,
  ) {
  }

  exportData(monthData: WorklogMonth, year: number, month: string | number, week?: WeeksInMonth) {
    const {rangeStart, rangeEnd, tasks} = this.worklogService.createTaskListForMonth(monthData, year, month, week);

    this._matDialog.open(DialogWorklogExportComponent, {
      restoreFocus: true,
      panelClass: 'big',
      data: {
        tasks,
        rangeStart,
        rangeEnd,
      }
    });
  }

  restoreTask(yearKey, monthKey, dayKey, task: TaskCopy) {
    this._matDialog.open(DialogConfirmComponent, {
      restoreFocus: true,
      data: {
        okTxt: 'Do it!',
        message: `Are you sure you want to move the task <strong>"${task.title}"</strong> into your todays task list?`,
      }
    }).afterClosed()
      .subscribe((isConfirm: boolean) => {
          // because we navigate away we don't need to worry about updating the worklog itself
          if (isConfirm) {
            this._taskService.restoreTask(task);
            this._router.navigate(['/work-view']);
          }
        }
      );
  }

  sortWorklogItems(a, b) {
    return b.key - a.key;
  }

  sortWorklogItemsReverse(a, b) {
    return a.key - b.key;
  }
}

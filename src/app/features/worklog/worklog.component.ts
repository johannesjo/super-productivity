import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { expandFadeAnimation } from '../../ui/animations/expand.ani';
import { WorklogDataForDay, WorklogMonth, WorklogWeek } from './worklog.model';
import { MatDialog } from '@angular/material/dialog';
import { Task, TaskCopy } from '../tasks/task.model';
import { TaskService } from '../tasks/task.service';
import { DialogWorklogExportComponent } from './dialog-worklog-export/dialog-worklog-export.component';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { Router } from '@angular/router';
import { standardListAnimation } from '../../ui/animations/standard-list.ani';
import { WorklogService } from './worklog.service';
import { getDateRangeForMonth } from '../../util/get-date-range-for-month';
import { getDateRangeForWeek } from '../../util/get-date-range-for-week';
import { fadeAnimation } from '../../ui/animations/fade.ani';
import { T } from '../../t.const';
import { WorkContextService } from '../work-context/work-context.service';

@Component({
  selector: 'worklog',
  templateUrl: './worklog.component.html',
  styleUrls: ['./worklog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation, standardListAnimation, fadeAnimation]
})
export class WorklogComponent {
  T: typeof T = T;
  expanded: { [key: string]: boolean } = {};

  constructor(
    public readonly worklogService: WorklogService,
    public readonly workContextService: WorkContextService,
    private readonly _persistenceService: PersistenceService,
    private readonly _taskService: TaskService,
    private readonly _matDialog: MatDialog,
    private readonly _router: Router,
  ) {
  }

  exportData(monthData: WorklogMonth, year: number, month: string | number, week?: number) {
    const {rangeStart, rangeEnd} = (typeof week === 'number')
      ? getDateRangeForWeek(year, week, +month)
      : getDateRangeForMonth(year, +month);

    this._matDialog.open(DialogWorklogExportComponent, {
      restoreFocus: true,
      panelClass: 'big',
      data: {
        rangeStart,
        rangeEnd,
      }
    });
  }

  restoreTask(task: TaskCopy) {
    this._matDialog.open(DialogConfirmComponent, {
      restoreFocus: true,
      data: {
        okTxt: T.G.DO_IT,
        message: T.F.WORKLOG.D_CONFIRM_RESTORE,
        translateParams: {title: task.title}
      }
    }).afterClosed()
      .subscribe(async (isConfirm: boolean) => {
          // because we navigate away we don't need to worry about updating the worklog itself
          if (isConfirm) {
            let subTasks;
            if (task.subTaskIds && task.subTaskIds.length) {
              const archiveState = await this._persistenceService.taskArchive.loadState();
              subTasks = task.subTaskIds
                .map(id => archiveState.entities[id])
                .filter(v => !!v);
            }

            console.log('RESTORE', task, subTasks);
            this._taskService.restoreTask(task, (subTasks || []) as Task[]);
            this._router.navigate(['/active/tasks']);
          }
        }
      );
  }

  sortWorklogItems(a: any, b: any) {
    return b.key - a.key;
  }

  sortWorklogItemsReverse(a: any, b: any) {
    return a.key - b.key;
  }

  trackByKey(i: number, val: { key: any; val: any }) {
    return val.key;
  }

  trackByForLogEntry(i: number, val: WorklogDataForDay) {
    return val.task.id;
  }

  trackByForWeek(i: number, val: WorklogWeek) {
    return val.weekNr;
  }

  async updateTimeSpentTodayForTask(task: Task, dateStr: string, newVal: number | string) {
    await this._taskService.updateEverywhere(task.id, {
      timeSpentOnDay: {
        ...task.timeSpentOnDay,
        [dateStr]: +newVal,
      }
    });
    this.worklogService.refreshWorklog();
  }
}

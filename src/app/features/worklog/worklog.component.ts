import {ChangeDetectionStrategy, ChangeDetectorRef, Component} from '@angular/core';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {ProjectService} from '../project/project.service';
import {expandFadeAnimation} from '../../ui/animations/expand.ani';
import {WorklogDataForDay, WorklogMonth, WorklogWeek} from './worklog.model';
import {MatDialog} from '@angular/material/dialog';
import {Task, TaskCopy} from '../tasks/task.model';
import {TaskService} from '../tasks/task.service';
import {DialogWorklogExportComponent} from './dialog-worklog-export/dialog-worklog-export.component';
import {DialogConfirmComponent} from '../../ui/dialog-confirm/dialog-confirm.component';
import {Router} from '@angular/router';
import {standardListAnimation} from '../../ui/animations/standard-list.ani';
import {WorklogService} from './worklog.service';
import {getDateRangeForMonth} from '../../util/get-date-range-for-month';
import {getDateRangeForWeek} from '../../util/get-date-range-for-week';
import {fadeAnimation} from '../../ui/animations/fade.ani';
import {T} from '../../t.const';

@Component({
  selector: 'worklog',
  templateUrl: './worklog.component.html',
  styleUrls: ['./worklog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation, standardListAnimation, fadeAnimation]
})
export class WorklogComponent {
  T = T;
  expanded: { [key: string]: boolean } = {};

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
            this._taskService.restoreTask(task, subTasks);
            this._router.navigate(['/active/tasks']);
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

  trackByKey(i, val: { key: any; val: any }) {
    return val.key;
  }

  trackByForLogEntry(i, val: WorklogDataForDay) {
    return val.task.id;
  }

  trackByForWeek(i, val: WorklogWeek) {
    return val.weekNr;
  }

  async updateTimeSpentTodayForTask(task: Task, dateStr: string, newVal: number | string) {
    await this._taskService.updateEverywhereForCurrentProject(task.id, {
      timeSpentOnDay: {
        ...task.timeSpentOnDay,
        [dateStr]: +newVal,
      }
    });
    this.worklogService.refreshWorklog();
  }
}

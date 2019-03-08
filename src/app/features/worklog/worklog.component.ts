import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { ProjectService } from '../project/project.service';
import { expandFadeAnimation } from '../../ui/animations/expand.ani';
import { Worklog, WorklogDay, WorklogMonth } from './map-archive-to-worklog';
import { MatDialog } from '@angular/material';
import { Subscription } from 'rxjs';
import { TaskCopy } from '../tasks/task.model';
import { TaskService } from '../tasks/task.service';
import { WeeksInMonth } from '../../util/get-weeks-in-month';
import { DialogWorklogExportComponent } from './dialog-worklog-export/dialog-worklog-export.component';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { Router } from '@angular/router';
import { standardListAnimation } from '../../ui/animations/standard-list.ani';
import { WorklogService } from './worklog.service';

const EMPTY_ENTITY = {
  ids: [],
  entities: {},
};


@Component({
  selector: 'worklog',
  templateUrl: './worklog.component.html',
  styleUrls: ['./worklog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation, standardListAnimation]
})
export class WorklogComponent implements OnInit, OnDestroy {
  worklog: Worklog = {};
  totalTimeSpent: number;
  private _subs = new Subscription();

  constructor(
    private readonly _persistenceService: PersistenceService,
    private readonly _projectService: ProjectService,
    private readonly _taskService: TaskService,
    private readonly _worklogService: WorklogService,
    private readonly _matDialog: MatDialog,
    private readonly _cd: ChangeDetectorRef,
    private readonly _router: Router,
  ) {
  }

  ngOnInit() {
    this._subs.add(this._projectService.currentId$.subscribe(async (id) => {
      const {worklog, totalTimeSpent} = await this._worklogService.loadForProject(id);
      this.worklog = worklog;
      this.totalTimeSpent = totalTimeSpent;
      // console.log(this.worklog);
      // this.exportData(this.worklog[2019].ent[3], 2019, 3);
      this._cd.detectChanges();
    }));
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  exportData(monthData: WorklogMonth, year: number, month: string | number, week?: WeeksInMonth) {
    const {rangeStart, rangeEnd, tasks} = this._worklogService.createTaskListForMonth(monthData, year, month, week);

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
          if (isConfirm) {
            const worklogDay: WorklogDay = this.worklog[yearKey].ent[monthKey].ent[dayKey];
            const index = worklogDay.logEntries.findIndex(ent => ent.task === task);
            if (index > -1) {
              // TODO refactor to task action!!!
              worklogDay.logEntries.splice(index, 1);
              this.worklog = {...this.worklog};

              this._taskService.restoreTask(task);
              this._router.navigate(['/work-view']);
            }
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

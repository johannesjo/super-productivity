import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
} from '@angular/core';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { expandFadeAnimation } from '../../ui/animations/expand.ani';
import { WorklogDataForDay, WorklogMonth, WorklogWeek } from './worklog.model';
import { MatDialog } from '@angular/material/dialog';
import { Task, TaskCopy } from '../tasks/task.model';
import { TaskService } from '../tasks/task.service';
import { DialogWorklogExportComponent } from './dialog-worklog-export/dialog-worklog-export.component';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { ActivatedRoute, Router } from '@angular/router';
import { standardListAnimation } from '../../ui/animations/standard-list.ani';
import { WorklogService } from './worklog.service';
import { getDateRangeForMonth } from '../../util/get-date-range-for-month';
import { getDateRangeForWeek } from '../../util/get-date-range-for-week';
import { fadeAnimation, fadeInSlowAnimation } from '../../ui/animations/fade.ani';
import { T } from '../../t.const';
import { WorkContextService } from '../work-context/work-context.service';
import { SearchQueryParams } from '../search-bar/search-bar.model';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { selectAllProjectColorsAndTitles } from '../project/store/project.selectors';

@Component({
  selector: 'worklog',
  templateUrl: './worklog.component.html',
  styleUrls: ['./worklog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    expandFadeAnimation,
    standardListAnimation,
    fadeAnimation,
    fadeInSlowAnimation,
  ],
})
export class WorklogComponent implements AfterViewInit, OnDestroy {
  T: typeof T = T;
  expanded: { [key: string]: boolean } = {};
  allProjectsColorAndTitle: { [key: string]: { title: string; color: string } } = {};

  private _subs: Subscription = new Subscription();

  constructor(
    public readonly worklogService: WorklogService,
    public readonly workContextService: WorkContextService,
    private readonly _persistenceService: PersistenceService,
    private readonly _taskService: TaskService,
    private readonly _matDialog: MatDialog,
    private readonly _router: Router,
    private readonly _route: ActivatedRoute,
    private readonly _store: Store,
  ) {}

  ngAfterViewInit(): void {
    this._subs.add(
      this._route.queryParams.subscribe((params) => {
        const { dateStr } = params as SearchQueryParams;
        if (!!dateStr) {
          this.expanded[dateStr] = true;
        }
      }),
    );
    this._subs.add(
      this._store
        .select(selectAllProjectColorsAndTitles)
        .subscribe((colorMap) => (this.allProjectsColorAndTitle = colorMap)),
    );
  }

  exportData(
    monthData: WorklogMonth,
    year: number,
    month: string | number,
    week?: number,
  ): void {
    const { rangeStart, rangeEnd } =
      typeof week === 'number'
        ? getDateRangeForWeek(year, week, +month)
        : getDateRangeForMonth(year, +month);

    this._matDialog.open(DialogWorklogExportComponent, {
      restoreFocus: true,
      panelClass: 'big',
      data: {
        rangeStart,
        rangeEnd,
      },
    });
  }

  restoreTask(task: TaskCopy): void {
    this._matDialog
      .open(DialogConfirmComponent, {
        restoreFocus: true,
        data: {
          okTxt: T.G.DO_IT,
          message: T.F.WORKLOG.D_CONFIRM_RESTORE,
          translateParams: { title: task.title },
        },
      })
      .afterClosed()
      .subscribe(async (isConfirm: boolean) => {
        // because we navigate away we don't need to worry about updating the worklog itself
        if (isConfirm) {
          let subTasks;
          if (task.subTaskIds && task.subTaskIds.length) {
            const archiveState = await this._persistenceService.taskArchive.loadState();
            subTasks = task.subTaskIds
              .map((id) => archiveState.entities[id])
              .filter((v) => !!v);
          }

          console.log('RESTORE', task, subTasks);
          this._taskService.restoreTask(task, (subTasks || []) as Task[]);
          this._router.navigate(['/active/tasks']);
        }
      });
  }

  sortWorklogItems(a: any, b: any): number {
    return b.key - a.key;
  }

  sortWorklogItemsReverse(a: any, b: any): number {
    return a.key - b.key;
  }

  trackByKey(i: number, val: { key: any; val: any }): number {
    return val.key;
  }

  trackByForLogEntry(i: number, val: WorklogDataForDay): string {
    return val.task.id;
  }

  trackByForWeek(i: number, val: WorklogWeek): number {
    return val.weekNr;
  }

  async updateTimeSpentTodayForTask(
    task: Task,
    dateStr: string,
    newVal: number | string,
  ): Promise<void> {
    await this._taskService.updateEverywhere(task.id, {
      timeSpentOnDay: {
        ...task.timeSpentOnDay,
        [dateStr]: +newVal,
      },
    });
    this.worklogService.refreshWorklog();
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }
}

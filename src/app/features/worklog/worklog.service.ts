import { Injectable } from '@angular/core';
import { Worklog, WorklogDay, WorklogWeek } from './worklog.model';
import { dedupeByKey } from '../../util/de-dupe-by-key';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { BehaviorSubject, from, merge, Observable } from 'rxjs';
import {
  concatMap,
  filter,
  first,
  map,
  shareReplay,
  startWith,
  switchMap,
  take,
} from 'rxjs/operators';
import { getWeekNumber } from '../../util/get-week-number';
import { WorkContextService } from '../work-context/work-context.service';
import { WorkContext } from '../work-context/work-context.model';
import { mapArchiveToWorklog } from './util/map-archive-to-worklog';
import { TaskService } from '../tasks/task.service';
import { createEmptyEntity } from '../../util/create-empty-entity';
import { getCompleteStateForWorkContext } from './util/get-complete-state-for-work-context.util';
import { NavigationEnd, Router } from '@angular/router';
import { DataInitService } from '../../core/data-init/data-init.service';
import { WorklogTask } from '../tasks/task.model';

@Injectable({ providedIn: 'root' })
export class WorklogService {
  // treated as private but needs to be assigned first
  archiveUpdateManualTrigger$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    true,
  );
  _archiveUpdateTrigger$: Observable<any> =
    this._dataInitService.isAllDataLoadedInitially$.pipe(
      concatMap(() =>
        merge(
          // this._workContextService.activeWorkContextOnceOnContextChange$,
          this.archiveUpdateManualTrigger$,
          this._router.events.pipe(
            filter((event: any) => event instanceof NavigationEnd),
            filter(
              ({ urlAfterRedirects }: NavigationEnd) =>
                urlAfterRedirects.includes('worklog') ||
                urlAfterRedirects.includes('daily-summary'),
            ),
          ),
        ),
      ),
    );

  // NOTE: task updates are not reflected
  // TODO improve to reflect task updates or load when route is changed to worklog or daily summary
  worklogData$: Observable<{
    worklog: Worklog;
    totalTimeSpent: number;
  }> = this._archiveUpdateTrigger$.pipe(
    switchMap(() => this._workContextService.activeWorkContext$.pipe(take(1))),
    switchMap((curCtx) =>
      from(this._loadForWorkContext(curCtx)).pipe(startWith<any, any>(null)),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  _worklogDataIfDefined$: Observable<{
    worklog: Worklog;
    totalTimeSpent: number;
  }> = this.worklogData$.pipe(filter((wd) => !!wd));

  worklog$: Observable<Worklog> = this._worklogDataIfDefined$.pipe(
    map((data) => data.worklog),
  );
  totalTimeSpent$: Observable<number> = this._worklogDataIfDefined$.pipe(
    map((data) => data.totalTimeSpent),
  );
  currentWeek$: Observable<WorklogWeek | null> = this.worklog$.pipe(
    map((worklog) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const weekNr = getWeekNumber(now);

      if (worklog[year] && worklog[year].ent[month]) {
        return (
          worklog[year].ent[month].weeks.find((week) => week.weekNr === weekNr) || null
        );
      }
      return null;
    }),
  );

  worklogTasks$: Observable<WorklogTask[]> = this.worklog$.pipe(
    map((worklog) => {
      let tasks: WorklogTask[] = [];

      Object.keys(worklog).forEach((yearKeyIN) => {
        const yearKey = +yearKeyIN;
        const year = worklog[yearKey];

        if (year && year.ent) {
          Object.keys(year.ent).forEach((monthKeyIN) => {
            // needs de-normalization
            const monthKey = +monthKeyIN;
            const month = year.ent[monthKey];

            if (month && month.ent) {
              Object.keys(month.ent).forEach((dayKeyIN) => {
                const dayKey = +dayKeyIN;
                const day: WorklogDay = month.ent[dayKey];
                if (day) {
                  tasks = tasks.concat(this._createTasksForDay(day));
                }
              });
            }
          });
        }
      });
      return tasks;
    }),
  );

  constructor(
    private readonly _persistenceService: PersistenceService,
    private readonly _workContextService: WorkContextService,
    private readonly _dataInitService: DataInitService,
    private readonly _taskService: TaskService,
    private readonly _router: Router,
  ) {}

  refreshWorklog() {
    this.archiveUpdateManualTrigger$.next(true);
  }

  // TODO this is not waiting for worklog data
  getTaskListForRange$(
    rangeStart: Date,
    rangeEnd: Date,
    isFilterOutTimeSpentOnOtherDays: boolean = false,
    projectId?: string | null,
  ): Observable<WorklogTask[]> {
    const isProjectIdProvided: boolean = !!projectId || projectId === null;

    return this.worklogTasks$.pipe(
      map((tasks) => {
        tasks = tasks.filter((task: WorklogTask) => {
          const taskDate = new Date(task.dateStr);
          return (
            (!isProjectIdProvided || task.projectId === projectId) &&
            taskDate >= rangeStart &&
            taskDate <= rangeEnd
          );
        });

        if (isFilterOutTimeSpentOnOtherDays) {
          tasks = tasks.map((task): WorklogTask => {
            const timeSpentOnDay: any = {};
            Object.keys(task.timeSpentOnDay).forEach((dateStr) => {
              const date = new Date(dateStr);

              if (date >= rangeStart && date <= rangeEnd) {
                timeSpentOnDay[dateStr] = task.timeSpentOnDay[dateStr];
              }
            });

            return {
              ...task,
              timeSpentOnDay,
            };
          });
        }

        return dedupeByKey(tasks, 'id');
      }),
    );
  }

  private async _loadForWorkContext(
    workContext: WorkContext,
  ): Promise<{ worklog: Worklog; totalTimeSpent: number }> {
    const archive =
      (await this._persistenceService.taskArchive.loadState()) || createEmptyEntity();
    const taskState =
      (await this._taskService.taskFeatureState$.pipe(first()).toPromise()) ||
      createEmptyEntity();

    // console.time('calcTime');
    const { completeStateForWorkContext, unarchivedIds } = getCompleteStateForWorkContext(
      workContext,
      taskState,
      archive,
    );
    // console.timeEnd('calcTime');

    const startEnd = {
      workStart: workContext.workStart,
      workEnd: workContext.workEnd,
    };

    if (completeStateForWorkContext) {
      const { worklog, totalTimeSpent } = mapArchiveToWorklog(
        completeStateForWorkContext,
        unarchivedIds,
        startEnd,
      );
      return {
        worklog,
        totalTimeSpent,
      };
    }
    return {
      worklog: {},
      totalTimeSpent: 0,
    };
  }

  private _createTasksForDay(data: WorklogDay): WorklogTask[] {
    const dayData = { ...data };

    return dayData.logEntries.map((entry) => {
      return {
        ...entry.task,
        timeSpent: entry.timeSpent,
        dateStr: dayData.dateStr,
      };
    });
  }
}

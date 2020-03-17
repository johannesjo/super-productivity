import {Injectable} from '@angular/core';
import {Worklog, WorklogDay, WorklogTask, WorklogWeek} from './worklog.model';
import {dedupeByKey} from '../../util/de-dupe-by-key';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {ProjectService} from '../project/project.service';
import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {getWeekNumber} from '../../util/get-week-number';
import {WorkContextService} from '../work-context/work-context.service';
import {WorkContext, WorkContextType} from '../work-context/work-context.model';
import {Dictionary, EntityState} from '@ngrx/entity';
import {Task} from '../tasks/task.model';
import {mapArchiveToWorklog} from './map-archive-to-worklog';

const EMPTY_ENTITY = {
  ids: [],
  entities: {},
};

@Injectable({
  providedIn: 'root'
})
export class WorklogService {
  // treated as private but needs to be assigned first
  _archiveUpdateTrigger$ = new BehaviorSubject(true);

  // NOTE: task updates are not reflected
  worklogData$: Observable<{ worklog: Worklog; totalTimeSpent: number }> = combineLatest([
    this._workContextService.activeWorkContext$,
    this._archiveUpdateTrigger$,
  ]).pipe(
    switchMap(([curCtx]) => {
      return this._loadForWorkContext(curCtx);
    }),
  );

  /** @deprecated */
  worklog: Worklog;
  worklog$: Observable<Worklog> = this.worklogData$.pipe(map(data => data.worklog));
  totalTimeSpent$: Observable<number> = this.worklogData$.pipe(map(data => data.totalTimeSpent));
  currentWeek$: Observable<WorklogWeek> = this.worklog$.pipe(
    map(worklog => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const weekNr = getWeekNumber(now);

      if (worklog[year] && worklog[year].ent[month]) {
        return worklog[year].ent[month].weeks.find(week => week.weekNr === weekNr);
      }
    }),
  );

  constructor(
    private readonly _persistenceService: PersistenceService,
    private readonly _workContextService: WorkContextService,
    private readonly _projectService: ProjectService,
  ) {
    // TODO not cool
    // this.worklog$.subscribe(worklog => this.worklog = worklog);
  }


  refreshWorklog() {
    this._archiveUpdateTrigger$.next(true);
  }

  // TODO this is not waiting for worklog data
  getTaskListForRange(rangeStart: Date, rangeEnd: Date, isFilterOutTimeSpentOnOtherDays = false): WorklogTask[] {
    let tasks = this._getAllWorklogTasks();

    tasks = tasks.filter((task) => {
      const taskDate = new Date(task.dateStr);
      return (taskDate >= rangeStart && taskDate <= rangeEnd);
    });

    if (isFilterOutTimeSpentOnOtherDays) {
      tasks = tasks.map((task): WorklogTask => {

        const timeSpentOnDay = {};
        Object.keys(task.timeSpentOnDay).forEach(dateStr => {
          const date = new Date(dateStr);

          if (date >= rangeStart && date <= rangeEnd) {
            timeSpentOnDay[dateStr] = task.timeSpentOnDay[dateStr];
          }
        });

        return {
          ...task,
          timeSpentOnDay
        };
      });
    }

    return dedupeByKey(tasks, 'id');
  }

  private _getAllWorklogTasks(): WorklogTask[] {
    const worklog: Worklog = this.worklog;
    let tasks: WorklogTask[] = [];

    Object.keys(worklog).forEach((yearKeyIN) => {
      const yearKey = +yearKeyIN;
      const year = worklog[yearKey];

      if (year && year.ent) {
        Object.keys(year.ent).forEach(monthKeyIN => {
          // needs de-normalization
          const monthKey = +monthKeyIN;
          const month = year.ent[monthKey];

          if (month && month.ent) {
            Object.keys(month.ent).forEach(dayKeyIN => {
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
  }


  private async _loadForWorkContext(workContext: WorkContext): Promise<{ worklog: Worklog; totalTimeSpent: number }> {
    const archive = await this._persistenceService.taskArchive.loadState() || EMPTY_ENTITY;
    // TODO get from store instead of database
    const taskState = await this._persistenceService.task.loadState() || EMPTY_ENTITY;

    // TODO simplify

    const startEnd = {
      workStart: workContext.workStart,
      workEnd: workContext.workEnd,
    };

    let completeStateForWorkContext: EntityState<Task>;

    if (workContext.type === WorkContextType.TAG) {
      const unarchivedIdsForTag: string[] = taskState.ids.reduce((acc, id) => (
        taskState.entities[id].tagIds.includes(workContext.id)
          ? [...acc, id]
          : [...acc]
      ), []);
      const archivedIdsForTag: string[] = archive.ids.reduce((acc, id) => (
        archive.entities[id].tagIds.includes(workContext.id)
          ? [...acc, id]
          : [...acc]
      ), []);

      const unarchivedEntities: Dictionary<Task> = unarchivedIdsForTag.reduce((acc, id) => ({
        ...acc,
        [id]: taskState.entities[id]
      }), {});
      const archivedEntities: Dictionary<Task> = archivedIdsForTag.reduce((acc, id) => ({
        ...acc,
        [id]: archive.entities[id]
      }), {});

      const allEntities: Dictionary<Task> = {
        ...unarchivedEntities,
        ...archivedEntities,
      };

      completeStateForWorkContext = {
        ids: [...unarchivedIdsForTag, ...archivedIdsForTag],
        entities: allEntities,
      };

      if (completeStateForWorkContext) {
        const {worklog, totalTimeSpent} = mapArchiveToWorklog(completeStateForWorkContext, unarchivedIdsForTag, startEnd);
        return {
          worklog,
          totalTimeSpent,
        };
      }
    } else if (workContext.type === WorkContextType.PROJECT) {
      const unarchivedIdsForTag: string[] = taskState.ids.reduce((acc, id) => (
        taskState.entities[id].projectId === workContext.id
          ? [...acc, id]
          : [...acc]
      ), []);
      const archivedIdsForTag: string[] = archive.ids.reduce((acc, id) => (
        archive.entities[id].projectId === workContext.id
          ? [...acc, id]
          : [...acc]
      ), []);

      const unarchivedEntities: Dictionary<Task> = unarchivedIdsForTag.reduce((acc, id) => ({
        ...acc,
        [id]: taskState.entities[id]
      }), {});
      const archivedEntities: Dictionary<Task> = archivedIdsForTag.reduce((acc, id) => ({
        ...acc,
        [id]: archive.entities[id]
      }), {});

      const allEntities: Dictionary<Task> = {
        ...unarchivedEntities,
        ...archivedEntities,
      };

      completeStateForWorkContext = {
        ids: [...unarchivedIdsForTag, ...archivedIdsForTag],
        entities: allEntities,
      };

      if (completeStateForWorkContext) {
        const {worklog, totalTimeSpent} = mapArchiveToWorklog(completeStateForWorkContext, unarchivedIdsForTag, startEnd);
        return {
          worklog,
          totalTimeSpent,
        };
      }
    }

    return {
      worklog: {},
      totalTimeSpent: null
    };
  }

  private _createTasksForDay(data: WorklogDay): WorklogTask[] {
    const dayData = {...data};

    return dayData.logEntries.map((entry) => {
      return {
        ...entry.task,
        timeSpent: entry.timeSpent,
        dateStr: dayData.dateStr,
      };
    });
  }
}

import { Injectable } from '@angular/core';
import { mapArchiveToWorklog, Worklog, WorklogDay, WorklogMonth, WorklogWeek } from './map-archive-to-worklog';
import { EntityState } from '@ngrx/entity';
import { Task } from '../tasks/task.model';
import { dedupeByKey } from '../../util/de-dupe-by-key';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { WeeksInMonth } from '../../util/get-weeks-in-month';
import { ProjectService } from '../project/project.service';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { getWeekNumber } from '../../util/get-week-number';

const EMPTY_ENTITY = {
  ids: [],
  entities: {},
};

@Injectable({
  providedIn: 'root'
})
export class WorklogService {


  // NOTE: task updates are not reflected
  private _worklogData$: Observable<{ worklog: Worklog; totalTimeSpent: number }> = this._projectService.currentId$.pipe(
    switchMap(id => {
      return this._loadForProject(id);
    }),
  );

  worklog$: Observable<Worklog> = this._worklogData$.pipe(map(data => data.worklog));
  totalTimeSpent$: Observable<number> = this._worklogData$.pipe(map(data => data.totalTimeSpent));
  currentWeek$: Observable<WorklogWeek> = this.worklog$.pipe(
    map(worklog => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const weekNr = getWeekNumber(now);

      // const month = now.getMonth();
      // const weekNr = getWeekNumber(now)-3;
      // console.log(month, weekNr);
      if (worklog[year] && worklog[year].ent[month]) {
        return worklog[year].ent[month].weeks.find(week => week.weekNr === weekNr);
      }
    }),
  );

  constructor(
    private readonly _persistenceService: PersistenceService,
    private readonly _projectService: ProjectService,
  ) {
  }

  createTaskListForMonth(monthData: WorklogMonth, year: number, month_: string | number, week?: WeeksInMonth):
    { tasks: Task[], rangeStart: Date, rangeEnd: Date } {
    let rangeStart;
    let rangeEnd;
    // denormalize to js month again
    const month = +month_ - 1;
    if (!week) {
      // firstDayOfMonth
      rangeStart = new Date(year, month, 1);
      // lastDayOfMonth
      rangeEnd = new Date(year, month + 1, 0);
    } else {
      // startOfWeek
      rangeStart = new Date(year, month, week.start);
      // endOfWeek
      rangeEnd = new Date(year, month, week.end);
    }

    rangeEnd.setHours(23, 59, 59);

    let tasks = [];
    Object.keys(monthData.ent).forEach(dayDateStr => {
      const entry: WorklogDay = monthData.ent[dayDateStr];
      tasks = tasks.concat(this._createTasksForDay(entry));
    });
    return {
      tasks: dedupeByKey(tasks, 'id'),
      rangeStart,
      rangeEnd
    };
  }


  private async _loadForProject(projectId): Promise<{ worklog: Worklog; totalTimeSpent: number }> {
    const archive = await this._persistenceService.loadTaskArchiveForProject(projectId) || EMPTY_ENTITY;
    const taskState = await this._persistenceService.loadTasksForProject(projectId) || EMPTY_ENTITY;

    const completeState: EntityState<Task> = {
      ids: [...archive.ids, ...taskState.ids] as string[],
      entities: {
        ...archive.entities,
        ...taskState.entities
      }
    };

    if (completeState) {
      const {worklog, totalTimeSpent} = mapArchiveToWorklog(completeState, taskState.ids);
      return {
        worklog,
        totalTimeSpent,
      };
    } else {
      return {
        worklog: {},
        totalTimeSpent: null
      };
    }
  }

  private _createTasksForDay(data: WorklogDay) {
    const tasks = [];
    const dayData = {...data};

    dayData.logEntries.forEach((entry) => {
      const task: any = {...entry.task};
      task.timeSpent = entry.timeSpent;
      task.dateStr = dayData.dateStr;
      tasks.push(task);
    });

    return dedupeByKey(tasks, 'id');
  }
}

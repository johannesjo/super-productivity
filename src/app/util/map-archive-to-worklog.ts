import { EntityState } from '@ngrx/entity';
import { Task } from '../features/tasks/task.model';
import { getWeeksInMonth, WeeksInMonth } from './get-weeks-in-month';

export interface WorklogDataForDay {
  timeSpent: number;
  task: Task;
  parentId: string;
  isVisible: boolean;
  isNoRestore?: boolean;
}

export interface WorklogDay {
  timeSpent: number;
  logEntries: WorklogDataForDay[];
  dateStr: string;
}

export interface WorklogMonth {
  timeSpent: number;
  daysWorked: number;
  ent: {
    [key: number]: WorklogDay;
  };
  weeks: WeeksInMonth[];
}

export interface WorklogYear {
  timeSpent: number;
  monthWorked: number;
  daysWorked: number;

  ent: {
    [key: number]: WorklogMonth;
  };
}

export interface Worklog {
  [key: number]: WorklogYear;
}

export const mapArchiveToWorklog = (taskState: EntityState<Task>, noRestoreIds = []): { worklog: Worklog, totalTimeSpent } => {
  const entities = taskState.entities;
  const worklog: Worklog = {};
  let totalTimeSpent = 0;
  Object.keys(entities).forEach(id => {
    const task = entities[id];

    Object.keys(task.timeSpentOnDay).forEach(dateStr => {
      const split = dateStr.split('-');
      const year = parseInt(split[0], 10);
      const month = parseInt(split[1], 10);
      const day = parseInt(split[2], 10);
      if (!worklog[year]) {
        worklog[year] = {
          timeSpent: 0,
          daysWorked: 0,
          monthWorked: 0,
          ent: {}
        };
      }
      if (!worklog[year].ent[month]) {
        console.log(month);
        worklog[year].ent[month] = {
          daysWorked: 0,
          timeSpent: 0,
          ent: {},
          weeks: getWeeksInMonth(month - 1, year)
        };
      }
      if (!worklog[year].ent[month].ent[day]) {
        worklog[year].ent[month].ent[day] = {
          timeSpent: 0,
          logEntries: [],
          dateStr: dateStr,
          // id: this.Uid()
        };
      }
      if (task.subTaskIds.length === 0) {
        const timeSpentForTask = task.timeSpentOnDay[dateStr];
        worklog[year].ent[month].ent[day].timeSpent
          = worklog[year].ent[month].ent[day].timeSpent
          + timeSpentForTask;
        worklog[year].ent[month].timeSpent
          = worklog[year].ent[month].timeSpent
          + timeSpentForTask;
        worklog[year].timeSpent
          = worklog[year].timeSpent
          + timeSpentForTask;
        totalTimeSpent += timeSpentForTask;
      }

      worklog[year].ent[month].ent[day].logEntries.push({
        task: task,
        parentId: task.parentId,
        isVisible: true,
        isNoRestore: noRestoreIds.includes(task.id),
        timeSpent: task.timeSpentOnDay[dateStr]
      });
    });
  });

  Object.keys(worklog).forEach((year_) => {
    const year: WorklogYear = worklog[year_];
    const monthKeys = Object.keys(year.ent);
    year.monthWorked = monthKeys.length;

    monthKeys.forEach((month_) => {
      const month: WorklogMonth = worklog[year_].ent[month_];
      const days = Object.keys(month.ent);
      month.daysWorked = days.length;
      year.daysWorked += days.length;
    });
  });

  return {worklog, totalTimeSpent};
};

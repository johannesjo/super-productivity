import { EntityState } from '@ngrx/entity';
import { Task } from '../../tasks/task.model';

export interface WorklogDataForDay {
  timeSpent: number;
  task: Task;
  parentTitle: string;
  parentId: string;
  isVisible: boolean;
}

export interface WorklogDay {
  timeSpent: number;
  logEntries: WorklogDataForDay[];
  dateStr: string;
}

export interface WorklogMonth {
  timeSpent: number;
  ent: {
    [key: number]: WorklogDay;
  };
}

export interface WorklogYear {
  timeSpent: number;
  ent: {
    [key: number]: WorklogMonth;
  };
}

export interface Worklog {
  [key: number]: WorklogYear;
}

export const mapArchiveToWorklog = (taskState: EntityState<Task>): Worklog => {
  const entities = taskState.entities;
  const worklog: Worklog = {};

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
          ent: {}
        };
      }
      if (!worklog[year].ent[month]) {
        worklog[year].ent[month] = {
          timeSpent: 0,
          ent: {}
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
        worklog[year].ent[month].ent[day].timeSpent
          = worklog[year].ent[month].ent[day].timeSpent
          + task.timeSpentOnDay[dateStr];
        worklog[year].ent[month].timeSpent
          = worklog[year].ent[month].timeSpent
          + task.timeSpentOnDay[dateStr];
        worklog[year].timeSpent
          = worklog[year].timeSpent
          + task.timeSpentOnDay[dateStr];

        worklog[year].ent[month].ent[day].logEntries.push({
          task: task,
          parentTitle: task.parentId ? entities[task.parentId].title : null,
          parentId: task.parentId,
          isVisible: true,
          timeSpent: task.timeSpentOnDay[dateStr]
        });
      }
    });
  });
  return worklog;
};

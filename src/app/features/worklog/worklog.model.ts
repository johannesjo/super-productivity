import {Task} from '../tasks/task.model';
import {WeeksInMonth} from '../../util/get-weeks-in-month';

export interface WorklogTask extends Task {
  dateStr?: string;
}

export interface WorklogDataForDay {
  timeSpent: number;
  task: WorklogTask;
  parentId: string;
  isNoRestore?: boolean;
}

export interface WorklogDay {
  timeSpent: number;
  logEntries: WorklogDataForDay[];
  dateStr: string;
  dayStr: string;
  workStart: number;
  workEnd: number;
}

export interface WorklogWeek extends WeeksInMonth {
  weekNr: number;
  timeSpent: number;
  daysWorked: number;
  ent: {
    [key: number]: WorklogDay;
  };
}

export interface WorklogMonth {
  timeSpent: number;
  daysWorked: number;
  ent: {
    [key: number]: WorklogDay;
  };
  weeks: WorklogWeek[];
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

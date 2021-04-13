import { Project } from '../../project/project.model';
import { Tag } from '../../tag/tag.model';
import { WorklogTask } from '../../tasks/task.model';
import { WorkStartEnd } from '../../work-context/work-context.model';

export interface WorklogExportData {
  tasks: WorklogTask[];
  projects: Project[];
  tags: Tag[];
  workTimes: WorkTimes;
}

export interface WorkTimes {
  start: WorkStartEnd;
  end: WorkStartEnd;
}

export type TimeFields = {
  dates: string[];
  timeSpent: number;
  timeEstimate: number;
  workStart: number;
  workEnd: number;
};

export type TaskFields = {
  tasks: WorklogTask[];
  titles: string[];
  titlesWithSub: string[];
  notes: string[];
  projects: string[];
  tags: string[];
};

export type RowItem = TimeFields & TaskFields;

export interface ItemsByKey<T> {
  [key: string]: T;
}

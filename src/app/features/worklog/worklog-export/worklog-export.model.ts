import { Project } from '../../project/project.model';
import { Tag } from '../../tag/tag.model';
import { WorklogTask } from '../../tasks/task.model';
import { WorkStartEnd } from '../../work-context/work-context.model';

export interface RowItem {
  dates: string[];
  workStart: number | undefined;
  workEnd: number | undefined;
  timeSpent: number;
  timeEstimate: number;
  tasks: WorklogTask[];
  titles?: string[];
  titlesWithSub?: string[];
  notes: string[];
  projects: string[];
  tags: string[];
}

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

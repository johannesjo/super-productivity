import { ProjectState } from '../../features/project/store/project.reducer';
import { TaskState } from '../../features/tasks/store/task.reducer';
import { GlobalConfig } from '../../features/config/config.model';
import { EntityState } from '@ngrx/entity';
import { Task } from '../../features/tasks/task.model';
import { IssueStateMap } from '../../features/issue/issue';
import { BookmarkState } from '../../features/bookmark/store/bookmark.reducer';
import { NoteState } from '../../features/note/store/note.reducer';
import { Reminder } from '../../features/reminder/reminder.model';
import { Attachment } from '../../features/attachment/attachment.model';
import { ProjectArchive } from '../../features/project/project.model';
import { MetricState } from '../../features/metric/metric.model';
import { ImprovementState } from '../../features/metric/improvement/improvement.model';
import { ObstructionState } from '../../features/metric/obstruction/obstruction.model';


export interface AppBaseData {
  project: ProjectState;
  archivedProjects: ProjectArchive;
  globalConfig: GlobalConfig;
  reminders?: Reminder[];
}

// NOTE: [key:string] always refers to projectId
export interface AppDataForProjects {
  note?: {
    [key: string]: NoteState;
  };
  bookmark?: {
    [key: string]: BookmarkState;
  };
  task?: {
    [key: string]: TaskState;
  };
  taskArchive?: {
    [key: string]: EntityState<Task>;
  };
  taskAttachment?: {
    [key: string]: EntityState<Attachment>;
  };
  metric?: {
    [key: string]: EntityState<MetricState>;
  };
  improvement?: {
    [key: string]: EntityState<ImprovementState>;
  };
  obstruction?: {
    [key: string]: EntityState<ObstructionState>;
  };
  issue?: {
    [key: string]: IssueStateMap;
  };
}

export interface AppDataComplete extends AppBaseData, AppDataForProjects {
  lastActiveTime: string;
}


import {ProjectState} from '../../features/project/store/project.reducer';
import {GlobalConfigState} from '../../features/config/global-config.model';
import {TaskArchive, TaskState} from '../../features/tasks/task.model';
import {BookmarkState} from '../../features/bookmark/store/bookmark.reducer';
import {NoteState} from '../../features/note/store/note.reducer';
import {Reminder} from '../../features/reminder/reminder.model';
import {ProjectArchive} from '../../features/project/project.model';
import {MetricState} from '../../features/metric/metric.model';
import {ImprovementState} from '../../features/metric/improvement/improvement.model';
import {ObstructionState} from '../../features/metric/obstruction/obstruction.model';
import {TaskRepeatCfgState} from '../../features/task-repeat-cfg/task-repeat-cfg.model';
import {WorkContextState} from '../../features/work-context/work-context.model';
import {TagState} from '../../features/tag/tag.model';
import {TaskAttachment} from '../../features/tasks/task-attachment/task-attachment.model';
import {EntityState} from '@ngrx/entity';

/** @deprecated */
export interface TaskAttachmentState extends EntityState<TaskAttachment> {
}

export interface AppBaseData {
  project: ProjectState;
  archivedProjects: ProjectArchive;
  globalConfig: GlobalConfigState;
  reminders?: Reminder[];

  task: TaskState;
  tag: TagState;
  taskArchive: TaskArchive;
  context: WorkContextState;
  taskRepeatCfg: TaskRepeatCfgState;

  /** @deprecated */
  taskAttachment?: TaskAttachmentState;
}

// NOTE: [key:string] always refers to projectId
export interface AppDataForProjects {
  note?: {
    [key: string]: NoteState;
  };
  bookmark?: {
    [key: string]: BookmarkState;
  };
  metric?: {
    [key: string]: MetricState;
  };
  improvement?: {
    [key: string]: ImprovementState;
  };
  obstruction?: {
    [key: string]: ObstructionState;
  };
}

export interface AppDataComplete extends AppBaseData, AppDataForProjects {
  lastActiveTime: number;
}


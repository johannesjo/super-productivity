import { ProjectState } from '../../features/project/store/project.reducer';
import { GlobalConfigState } from '../../features/config/global-config.model';
import { TaskArchive, TaskState } from '../../features/tasks/task.model';
import { BookmarkState } from '../../features/bookmark/store/bookmark.reducer';
import { NoteState } from '../../features/note/store/note.reducer';
import { Reminder } from '../../features/reminder/reminder.model';
import { MetricState } from '../../features/metric/metric.model';
import { ImprovementState } from '../../features/metric/improvement/improvement.model';
import { ObstructionState } from '../../features/metric/obstruction/obstruction.model';
import { TaskRepeatCfgState } from '../../features/task-repeat-cfg/task-repeat-cfg.model';
import { EntityState } from '@ngrx/entity';
import { TaskAttachment } from '../../features/tasks/task-attachment/task-attachment.model';
import { ProjectArchive } from '../../features/project/project-archive.model';

export interface LegacyAppBaseData {
  project: ProjectState;
  archivedProjects: ProjectArchive;
  globalConfig: GlobalConfigState;
  reminders?: Reminder[];
}

// NOTE: [key:string] always refers to projectId
export interface LegacyAppDataForProjects {
  note?: {
    [key: string]: NoteState;
  };
  bookmark?: {
    [key: string]: BookmarkState;
  };
  task?: {
    [key: string]: TaskState;
  };
  taskRepeatCfg?: {
    [key: string]: TaskRepeatCfgState;
  };
  taskArchive?: {
    [key: string]: TaskArchive;
  };
  taskAttachment?: {
    [key: string]: EntityState<TaskAttachment>;
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

export interface LegacyAppDataComplete
  extends LegacyAppBaseData,
    LegacyAppDataForProjects {
  lastActiveTime: number;
}

export interface LegacyPersistenceBaseModel<T> {
  appDataKey: keyof LegacyAppBaseData;

  load(isSkipMigration?: boolean): Promise<T>;

  save(state: T, isForce?: boolean): Promise<unknown>;
}

// eslint-disable-next-line no-unused-vars
export interface LegacyPersistenceForProjectModel<S, M> {
  appDataKey: keyof LegacyAppDataForProjects;

  load(projectId: string): Promise<S>;

  save(projectId: string, state: S, isForce?: boolean): Promise<unknown>;
}

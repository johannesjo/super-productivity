import { GlobalConfigState } from '../../features/config/global-config.model';
import { TaskArchive, TaskState } from '../../features/tasks/task.model';
import { Reminder } from '../../features/reminder/reminder.model';
import { MetricState } from '../../features/metric/metric.model';
import { ImprovementState } from '../../features/metric/improvement/improvement.model';
import { ObstructionState } from '../../features/metric/obstruction/obstruction.model';
import { TaskRepeatCfgState } from '../../features/task-repeat-cfg/task-repeat-cfg.model';
import { TagState } from '../../features/tag/tag.model';
import { TaskAttachment } from '../../features/tasks/task-attachment/task-attachment.model';
import { EntityState } from '@ngrx/entity';
import { SimpleCounterState } from '../../features/simple-counter/simple-counter.model';
import { ProjectArchive } from '../../features/project/project-archive.model';
import { SyncProvider } from './sync-provider.model';
import { ProjectState } from '../../features/project/project.model';
import { BookmarkState } from '../../features/bookmark/bookmark.model';
import { NoteState } from '../../features/note/note.model';

/** @deprecated */
export type TaskAttachmentState = EntityState<TaskAttachment>;

export interface AppBaseData {
  project: ProjectState;
  archivedProjects: ProjectArchive;
  globalConfig: GlobalConfigState;
  reminders: Reminder[];
  note: NoteState;

  // Metric models
  metric: MetricState;
  improvement: ImprovementState;
  obstruction: ObstructionState;

  task: TaskState;
  tag: TagState;
  simpleCounter: SimpleCounterState;
  taskArchive: TaskArchive;
  taskRepeatCfg: TaskRepeatCfgState;
}

export interface LocalSyncMetaForProvider {
  lastSync: number;
  rev: string | null;
  revTaskArchive: string | null;
}

export interface LocalSyncMetaModel {
  [SyncProvider.WebDAV]: LocalSyncMetaForProvider;
  [SyncProvider.Dropbox]: LocalSyncMetaForProvider;
  [SyncProvider.LocalFile]: LocalSyncMetaForProvider;
}

export type AppBaseDataEntityLikeStates =
  | ProjectState
  | TaskState
  | TaskRepeatCfgState
  | TaskArchive
  | SimpleCounterState;

// NOTE: [key:string] always refers to projectId
export interface AppDataForProjects {
  bookmark: {
    [key: string]: BookmarkState;
  };
}

export interface AppDataComplete extends AppBaseData, AppDataForProjects {
  lastLocalSyncModelChange: number | null;
}

export type DialogConflictResolutionResult = 'USE_LOCAL' | 'USE_REMOTE' | false;

export type DialogPermissionResolutionResult = 'DISABLED_SYNC' | 'GRANTED_PERMISSION';

export type SyncGetRevResult = 'NO_REMOTE_DATA' | 'HANDLED_ERROR' | Error;

export type SyncResult =
  | 'SUCCESS'
  | 'NO_UPDATE_REQUIRED'
  | 'USER_ABORT'
  | 'ERROR'
  | 'SPECIAL'
  | 'CONFLICT_DIALOG';

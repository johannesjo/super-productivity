import { GlobalConfigState } from '../../features/config/global-config.model';
import { TaskArchive, TaskState } from '../../features/tasks/task.model';
import { Reminder } from '../../features/reminder/reminder.model';
import { MetricState } from '../../features/metric/metric.model';
import { ImprovementState } from '../../features/metric/improvement/improvement.model';
import { ObstructionState } from '../../features/metric/obstruction/obstruction.model';
import { TaskRepeatCfgState } from '../../features/task-repeat-cfg/task-repeat-cfg.model';
import { TagState } from '../../features/tag/tag.model';
import { SimpleCounterState } from '../../features/simple-counter/simple-counter.model';
import { ProjectArchive } from '../../features/project/project-archive.model';
import { SyncProvider } from './sync-provider.model';
import { ProjectState } from '../../features/project/project.model';
import { BookmarkState } from '../../features/bookmark/bookmark.model';
import { NoteState } from '../../features/note/note.model';
import { PlannerState } from '../../features/planner/store/planner.reducer';

export interface AppBaseWithoutLastSyncModelChange {
  project: ProjectState;
  globalConfig: GlobalConfigState;
  reminders: Reminder[];
  planner: PlannerState;
  note: NoteState;

  // Metric models
  metric: MetricState;
  improvement: ImprovementState;
  obstruction: ObstructionState;

  task: TaskState;
  tag: TagState;
  simpleCounter: SimpleCounterState;
  taskRepeatCfg: TaskRepeatCfgState;
}

export interface AppMainFileNoRevsData
  extends AppBaseWithoutLastSyncModelChange,
    AppDataForProjects {
  lastLocalSyncModelChange: number | null;
}

export interface AppMainFileData extends AppMainFileNoRevsData {
  archiveRev: string;
  archiveLastUpdate: number;
}

export interface AppArchiveFileData {
  taskArchive: TaskArchive;
  archivedProjects: ProjectArchive;
}

export interface AppBaseData
  extends AppBaseWithoutLastSyncModelChange,
    AppArchiveFileData {}

export interface LocalSyncMetaForProvider {
  lastSync: number;
  rev: string | null;
  revTaskArchive: string | null;
  // currently dropbox only
  accessToken?: string;
  refreshToken?: string;
  _tokenExpiresAt?: number;
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
  lastArchiveUpdate: number | null;
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

import {
  initialProjectState,
  ProjectState,
} from '../../features/project/store/project.reducer';
import { GlobalConfigState } from '../../features/config/global-config.model';
import { TaskArchive, TaskState } from '../../features/tasks/task.model';
import { BookmarkState } from '../../features/bookmark/store/bookmark.reducer';
import { NoteState } from '../../features/note/store/note.reducer';
import { Reminder } from '../../features/reminder/reminder.model';
import { MetricState } from '../../features/metric/metric.model';
import { ImprovementState } from '../../features/metric/improvement/improvement.model';
import { ObstructionState } from '../../features/metric/obstruction/obstruction.model';
import { TaskRepeatCfgState } from '../../features/task-repeat-cfg/task-repeat-cfg.model';
import { TagState } from '../../features/tag/tag.model';
import { TaskAttachment } from '../../features/tasks/task-attachment/task-attachment.model';
import { EntityState } from '@ngrx/entity';
import { SimpleCounterState } from '../../features/simple-counter/simple-counter.model';
import { DEFAULT_GLOBAL_CONFIG } from '../../features/config/default-global-config.const';
import { initialTaskState } from '../../features/tasks/store/task.reducer';
import { initialTagState } from '../../features/tag/store/tag.reducer';
import { initialSimpleCounterState } from '../../features/simple-counter/store/simple-counter.reducer';
import { createEmptyEntity } from '../../util/create-empty-entity';
import { initialTaskRepeatCfgState } from '../../features/task-repeat-cfg/store/task-repeat-cfg.reducer';
import { ProjectArchive } from '../../features/project/project-archive.model';
import { SyncProvider } from './sync-provider.model';
import { initialMetricState } from '../../features/metric/store/metric.reducer';
import { initialImprovementState } from '../../features/metric/improvement/store/improvement.reducer';
import { initialObstructionState } from '../../features/metric/obstruction/store/obstruction.reducer';

/** @deprecated */
export type TaskAttachmentState = EntityState<TaskAttachment>;

export interface AppBaseData {
  project: ProjectState;
  archivedProjects: ProjectArchive;
  globalConfig: GlobalConfigState;
  reminders: Reminder[];

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
}

export interface LocalSyncMetaModel {
  [SyncProvider.GoogleDrive]: LocalSyncMetaForProvider;
  [SyncProvider.WebDAV]: LocalSyncMetaForProvider;
  [SyncProvider.Dropbox]: LocalSyncMetaForProvider;
}

export type AppBaseDataEntityLikeStates =
  | ProjectState
  | TaskState
  | TaskRepeatCfgState
  | TaskArchive
  | SimpleCounterState;

// NOTE: [key:string] always refers to projectId
export interface AppDataForProjects {
  note: {
    [key: string]: NoteState;
  };
  bookmark: {
    [key: string]: BookmarkState;
  };
}

export interface AppDataCompleteOptionalSyncModelChange
  extends AppBaseData,
    AppDataForProjects {
  lastLocalSyncModelChange?: number | null;
}

export interface AppDataComplete extends AppBaseData, AppDataForProjects {
  lastLocalSyncModelChange: number | null;
}

export const DEFAULT_APP_BASE_DATA: AppBaseData = {
  project: initialProjectState,
  archivedProjects: {},
  globalConfig: DEFAULT_GLOBAL_CONFIG,
  reminders: [],

  task: initialTaskState,
  tag: initialTagState,
  simpleCounter: initialSimpleCounterState,
  taskArchive: createEmptyEntity(),
  taskRepeatCfg: initialTaskRepeatCfgState,

  // metric
  metric: initialMetricState,
  improvement: initialImprovementState,
  obstruction: initialObstructionState,
};

export type DialogConflictResolutionResult = 'USE_LOCAL' | 'USE_REMOTE' | false;

export type SyncGetRevResult = 'NO_REMOTE_DATA' | 'HANDLED_ERROR' | Error;

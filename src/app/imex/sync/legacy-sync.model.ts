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
import { LocalSyncMetaForProvider } from './sync.model';

/** @deprecated */
export interface LegacyAppBaseData {
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

export interface LocalSyncMetaModel {
  [SyncProvider.WebDAV]: LocalSyncMetaForProvider;
  [SyncProvider.Dropbox]: LocalSyncMetaForProvider;
  [SyncProvider.LocalFile]: LocalSyncMetaForProvider;
}

export type LegacyAppBaseDataEntityLikeStates =
  | ProjectState
  | TaskState
  | TaskRepeatCfgState
  | TaskArchive
  | SimpleCounterState;

// NOTE: [key:string] always refers to projectId
export interface LegacyAppDataForProjects {
  note: {
    [key: string]: NoteState;
  };
  bookmark: {
    [key: string]: BookmarkState;
  };
}

export interface LegacyAppDataCompleteOptionalSyncModelChange
  extends LegacyAppBaseData,
    LegacyAppDataForProjects {
  lastLocalSyncModelChange?: number | null;
}

export interface LegacyAppDataComplete
  extends LegacyAppBaseData,
    LegacyAppDataForProjects {
  lastLocalSyncModelChange: number | null;
}

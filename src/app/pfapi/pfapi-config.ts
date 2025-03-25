import {
  AllModelData,
  DataRepairNotPossibleError,
  Dropbox,
  ModelCfg,
  PfapiBaseCfg,
} from './api';
import { ProjectState } from '../features/project/project.model';
import { GlobalConfigState } from '../features/config/global-config.model';
import { Reminder } from '../features/reminder/reminder.model';
import {
  plannerInitialState,
  PlannerState,
} from '../features/planner/store/planner.reducer';
import { BoardsState, initialBoardsState } from '../features/boards/store/boards.reducer';
import { NoteState } from '../features/note/note.model';
import { IssueProviderState } from '../features/issue/issue.model';
import { MetricState } from '../features/metric/metric.model';
import { ImprovementState } from '../features/metric/improvement/improvement.model';
import { ObstructionState } from '../features/metric/obstruction/obstruction.model';
import { TaskArchive, TaskState } from '../features/tasks/task.model';
import { TagState } from '../features/tag/tag.model';
import { SimpleCounterState } from '../features/simple-counter/simple-counter.model';
import { TaskRepeatCfgState } from '../features/task-repeat-cfg/task-repeat-cfg.model';
import { initialProjectState } from '../features/project/store/project.reducer';
import { DEFAULT_GLOBAL_CONFIG } from '../features/config/default-global-config.const';
import { initialNoteState } from '../features/note/store/note.reducer';
import { issueProviderInitialState } from '../features/issue/store/issue-provider.reducer';
import { initialMetricState } from '../features/metric/store/metric.reducer';
import { initialImprovementState } from '../features/metric/improvement/store/improvement.reducer';
import { initialObstructionState } from '../features/metric/obstruction/store/obstruction.reducer';
import { initialTaskState } from '../features/tasks/store/task.reducer';
import { initialTagState } from '../features/tag/store/tag.reducer';
import { initialSimpleCounterState } from '../features/simple-counter/store/simple-counter.reducer';
import { initialTaskRepeatCfgState } from '../features/task-repeat-cfg/store/task-repeat-cfg.reducer';
import { DROPBOX_APP_KEY } from '../imex/sync/dropbox/dropbox.const';
import { Webdav } from './api/sync/providers/webdav/webdav';
import { isDataRepairPossible } from '../core/data-repair/is-data-repair-possible.util';
import { isValidAppData } from '../imex/sync/is-valid-app-data.util';
import { dataRepair } from '../core/data-repair/data-repair.util';
import { LocalFileSyncElectron } from './api/sync/providers/local-file-sync/local-file-sync-electron';
import { IS_ELECTRON } from '../app.constants';

export const CROSS_MODEL_VERSION = 1 as const;

export type PfapiAllModelCfg = {
  project: ModelCfg<ProjectState>;
  globalConfig: ModelCfg<GlobalConfigState>;
  planner: ModelCfg<PlannerState>;
  boards: ModelCfg<BoardsState>;
  note: ModelCfg<NoteState>;
  issueProvider: ModelCfg<IssueProviderState>;

  // Metric models
  metric: ModelCfg<MetricState>;
  improvement: ModelCfg<ImprovementState>;
  obstruction: ModelCfg<ObstructionState>;

  task: ModelCfg<TaskState>;
  tag: ModelCfg<TagState>;
  simpleCounter: ModelCfg<SimpleCounterState>;
  taskRepeatCfg: ModelCfg<TaskRepeatCfgState>;

  taskArchive: ModelCfg<TaskArchive>;
  reminders: ModelCfg<Reminder[]>;
};
export type AppDataCompleteNew = AllModelData<PfapiAllModelCfg>;

export const PFAPI_MODEL_CFGS: PfapiAllModelCfg = {
  task: {
    modelVersion: 1,
    defaultData: initialTaskState,
    isMainFileModel: true,
  },
  project: {
    modelVersion: 1,
    defaultData: initialProjectState,
    isMainFileModel: true,
  },
  tag: {
    modelVersion: 1,
    defaultData: initialTagState,
    isMainFileModel: true,
  },
  simpleCounter: {
    modelVersion: 1,
    defaultData: initialSimpleCounterState,
    isMainFileModel: true,
  },
  reminders: {
    modelVersion: 1,
    defaultData: [],
    isMainFileModel: true,
  },
  planner: {
    modelVersion: 1,
    defaultData: plannerInitialState,
    isMainFileModel: true,
  },
  boards: {
    modelVersion: 1,
    defaultData: initialBoardsState,
    isMainFileModel: true,
  },
  note: {
    modelVersion: 1,
    defaultData: initialNoteState,
    isMainFileModel: true,
  },
  taskRepeatCfg: {
    modelVersion: 1,
    defaultData: initialTaskRepeatCfgState,
    // needs to be due to last creation data being saved to model
    isMainFileModel: true,
  },

  //-------------------------------
  globalConfig: {
    modelVersion: 1,
    defaultData: DEFAULT_GLOBAL_CONFIG,
  },
  issueProvider: {
    modelVersion: 1,
    defaultData: issueProviderInitialState,
  },

  // Metric models
  metric: {
    modelVersion: 1,
    defaultData: initialMetricState,
  },
  improvement: {
    modelVersion: 1,
    defaultData: initialImprovementState,
  },
  obstruction: {
    modelVersion: 1,
    defaultData: initialObstructionState,
  },

  taskArchive: {
    modelVersion: 1,
    defaultData: initialTaskState,
  },
  // TODO task archive old
} as const;

export const fileSyncElectron = new LocalFileSyncElectron();

export const PFAPI_SYNC_PROVIDERS = [
  new Dropbox({
    appKey: DROPBOX_APP_KEY,
    basePath: `/`,
  }),
  new Webdav(),
  ...(IS_ELECTRON ? [fileSyncElectron] : []),
  // TODO android
  // ...(IS_ELECTRON ? [fileSyncElectron] : []),
];

export const PFAPI_CFG: PfapiBaseCfg<PfapiAllModelCfg> = {
  crossModelVersion: CROSS_MODEL_VERSION,
  isMainFileMode: true,
  validate: (data) => {
    return isValidAppData(data);
  },
  repair: (data: any) => {
    if (!isDataRepairPossible(data)) {
      throw new DataRepairNotPossibleError(data);
    }
    return dataRepair(data);
  },
};

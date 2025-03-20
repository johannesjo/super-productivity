import { Dropbox, ModelCfg } from './api';
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

export type PfapiModelCfgs = {
  project: ModelCfg<ProjectState>;
  globalConfig: ModelCfg<GlobalConfigState>;
  reminders: ModelCfg<Reminder[]>;
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
  reminder: ModelCfg<Reminder[]>;
};

export const PFAPI_MODEL_CFGS: PfapiModelCfgs = {
  project: {
    modelVersion: 1,
    defaultData: initialProjectState,
  },
  globalConfig: {
    modelVersion: 1,
    defaultData: DEFAULT_GLOBAL_CONFIG,
  },
  reminders: {
    modelVersion: 1,
    defaultData: [],
  },
  planner: {
    modelVersion: 1,
    defaultData: plannerInitialState,
  },
  boards: {
    modelVersion: 1,
    defaultData: initialBoardsState,
  },
  note: {
    modelVersion: 1,
    defaultData: initialNoteState,
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

  task: {
    modelVersion: 1,
    defaultData: initialTaskState,
  },
  tag: {
    modelVersion: 1,
    defaultData: initialTagState,
  },
  simpleCounter: {
    modelVersion: 1,
    defaultData: initialSimpleCounterState,
  },
  taskRepeatCfg: {
    modelVersion: 1,
    defaultData: initialTaskRepeatCfgState,
  },

  taskArchive: {
    modelVersion: 1,
    defaultData: initialTaskState,
  },
  reminder: {
    modelVersion: 1,
    defaultData: [],
  },
} as const;

export const PFAPI_SYNC_PROVIDERS = [
  new Dropbox({
    appKey: DROPBOX_APP_KEY,
    // basePath: `/${DROPBOX_APP_FOLDER}`,
    basePath: `/`,
  }),
];

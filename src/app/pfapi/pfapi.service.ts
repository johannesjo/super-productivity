import { Injectable } from '@angular/core';
import { Dropbox, ModelCfg, ModelCfgToModelCtrl, Pfapi } from './api';
import { DROPBOX_APP_KEY } from '../imex/sync/dropbox/dropbox.const';
import { ProjectState } from '../features/project/project.model';
import { TaskArchive, TaskState } from '../features/tasks/task.model';
import { Reminder } from '../features/reminder/reminder.model';
import { GlobalConfigState } from '../features/config/global-config.model';
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
import { TagState } from '../features/tag/tag.model';
import { SimpleCounterState } from '../features/simple-counter/simple-counter.model';
import { TaskRepeatCfgState } from '../features/task-repeat-cfg/task-repeat-cfg.model';
import { initialProjectState } from '../features/project/store/project.reducer';
import { DEFAULT_GLOBAL_CONFIG } from '../features/config/default-global-config.const';
import { issueProviderInitialState } from '../features/issue/store/issue-provider.reducer';
import { initialMetricState } from '../features/metric/store/metric.reducer';
import { initialNoteState } from '../features/note/store/note.reducer';
import { initialTaskState } from '../features/tasks/store/task.reducer';
import { initialImprovementState } from '../features/metric/improvement/store/improvement.reducer';
import { initialObstructionState } from '../features/metric/obstruction/store/obstruction.reducer';
import { initialTagState } from '../features/tag/store/tag.reducer';
import { initialSimpleCounterState } from '../features/simple-counter/store/simple-counter.reducer';
import { initialTaskRepeatCfgState } from '../features/task-repeat-cfg/store/task-repeat-cfg.reducer';

type MyModelCfgs = {
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

const MODEL_CFGS: MyModelCfgs = {
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

const SYNC_PROVIDERS = [
  new Dropbox({
    appKey: DROPBOX_APP_KEY,
    // basePath: `/${DROPBOX_APP_FOLDER}`,
    basePath: `/`,
  }),
];

@Injectable({
  providedIn: 'root',
})
export class PfapiService {
  public readonly pf = new Pfapi(MODEL_CFGS, SYNC_PROVIDERS, {});
  public readonly m: ModelCfgToModelCtrl<MyModelCfgs> = this.pf.m;

  constructor() {}
}

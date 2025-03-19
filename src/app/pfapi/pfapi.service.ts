import { Injectable } from '@angular/core';
import { Dropbox, ModelCfg, ModelCfgToModelCtrl, Pfapi } from './api';
import { DROPBOX_APP_KEY } from '../imex/sync/dropbox/dropbox.const';
import { ProjectState } from '../features/project/project.model';
import { TaskArchive, TaskState } from '../features/tasks/task.model';
import { Reminder } from '../features/reminder/reminder.model';
import { GlobalConfigState } from '../features/config/global-config.model';
import { PlannerState } from '../features/planner/store/planner.reducer';
import { BoardsState } from '../features/boards/store/boards.reducer';
import { NoteState } from '../features/note/note.model';
import { IssueProviderState } from '../features/issue/issue.model';
import { MetricState } from '../features/metric/metric.model';
import { ImprovementState } from '../features/metric/improvement/improvement.model';
import { ObstructionState } from '../features/metric/obstruction/obstruction.model';
import { TagState } from '../features/tag/tag.model';
import { SimpleCounterState } from '../features/simple-counter/simple-counter.model';
import { TaskRepeatCfgState } from '../features/task-repeat-cfg/task-repeat-cfg.model';

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
  },
  globalConfig: {
    modelVersion: 1,
  },
  reminders: {
    modelVersion: 1,
  },
  planner: {
    modelVersion: 1,
  },
  boards: {
    modelVersion: 1,
  },
  note: {
    modelVersion: 1,
  },
  issueProvider: {
    modelVersion: 1,
  },

  // Metric models
  metric: {
    modelVersion: 1,
  },
  improvement: {
    modelVersion: 1,
  },
  obstruction: {
    modelVersion: 1,
  },

  task: {
    modelVersion: 1,
  },
  tag: {
    modelVersion: 1,
  },
  simpleCounter: {
    modelVersion: 1,
  },
  taskRepeatCfg: {
    modelVersion: 1,
  },

  taskArchive: {
    modelVersion: 1,
  },
  reminder: {
    modelVersion: 1,
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

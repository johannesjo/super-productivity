import { PersistenceBaseModelCfg, PersistenceEntityModelCfg } from './persistence.model';
import { GlobalConfigState } from '../../features/config/global-config.model';
import { Reminder } from '../../features/reminder/reminder.model';
import { Project, ProjectState } from '../../features/project/project.model';
import { projectReducer } from '../../features/project/store/project.reducer';
import { Tag, TagState } from '../../features/tag/tag.model';
import { tagReducer } from '../../features/tag/store/tag.reducer';
import {
  SimpleCounter,
  SimpleCounterState,
} from '../../features/simple-counter/simple-counter.model';
import { simpleCounterReducer } from '../../features/simple-counter/store/simple-counter.reducer';
import { Note, NoteState } from '../../features/note/note.model';
import { noteReducer } from '../../features/note/store/note.reducer';
import { Metric, MetricState } from '../../features/metric/metric.model';
import { metricReducer } from '../../features/metric/store/metric.reducer';

import {
  Improvement,
  ImprovementState,
} from '../../features/metric/improvement/improvement.model';
import { improvementReducer } from '../../features/metric/improvement/store/improvement.reducer';
import {
  Obstruction,
  ObstructionState,
} from '../../features/metric/obstruction/obstruction.model';
import { obstructionReducer } from '../../features/metric/obstruction/store/obstruction.reducer';
import {
  ArchiveTask,
  Task,
  TaskArchive,
  TaskState,
} from '../../features/tasks/task.model';
import { taskReducer } from '../../features/tasks/store/task.reducer';
import {
  TaskRepeatCfg,
  TaskRepeatCfgState,
} from '../../features/task-repeat-cfg/task-repeat-cfg.model';
import { taskRepeatCfgReducer } from '../../features/task-repeat-cfg/store/task-repeat-cfg.reducer';
import { AppBaseData } from '../../imex/sync/sync.model';
import { PlannerState } from '../../features/planner/store/planner.reducer';
import { IssueProvider, IssueProviderState } from '../../features/issue/issue.model';
import { issueProviderReducer } from '../../features/issue/store/issue-provider.reducer';
import { BoardsState } from '../../features/boards/store/boards.reducer';

interface PersistenceBaseModelCfgs {
  // [key: string]: PersistenceBaseModelCfg<any>;
  globalConfig: PersistenceBaseModelCfg<GlobalConfigState>;
  reminders: PersistenceBaseModelCfg<Reminder[]>;
  planner: PersistenceBaseModelCfg<PlannerState>;
  boards: PersistenceBaseModelCfg<BoardsState>;
}

interface PersistenceEntityModelCfgs {
  project: PersistenceEntityModelCfg<ProjectState, Project>;
  issueProvider: PersistenceEntityModelCfg<IssueProviderState, IssueProvider>;
  tag: PersistenceEntityModelCfg<TagState, Tag>;
  simpleCounter: PersistenceEntityModelCfg<SimpleCounterState, SimpleCounter>;
  note: PersistenceEntityModelCfg<NoteState, Note>;

  // METRIC MODELS
  metric: PersistenceEntityModelCfg<MetricState, Metric>;
  improvement: PersistenceEntityModelCfg<ImprovementState, Improvement>;
  obstruction: PersistenceEntityModelCfg<ObstructionState, Obstruction>;

  // MAIN TASK MODELS
  task: PersistenceEntityModelCfg<TaskState, Task>;
  taskArchive: PersistenceEntityModelCfg<TaskArchive, ArchiveTask>;
  taskRepeatCfg: PersistenceEntityModelCfg<TaskRepeatCfgState, TaskRepeatCfg>;
}

export const BASE_MODEL_CFGS: PersistenceBaseModelCfgs = {
  globalConfig: {
    appDataKey: 'globalConfig',
    // TODO remove this everywhere
    modelVersion: 99,
    migrateFn: (v) => v,
  },
  reminders: {
    appDataKey: 'reminders',
    modelVersion: 99,
    // no migrations needed yet
    migrateFn: (s: Reminder[]) => s,
  },
  planner: {
    appDataKey: 'planner',
    modelVersion: 99,
    // no migrations needed yet
    migrateFn: (s: PlannerState): PlannerState => s,
  },
  boards: {
    appDataKey: 'boards',
    modelVersion: 99,
    // no migrations needed yet
    migrateFn: (s: BoardsState): BoardsState => s,
  },
};

export const ENTITY_MODEL_CFGS: PersistenceEntityModelCfgs = {
  project: {
    appDataKey: 'project',
    modelVersion: 99,
    reducerFn: projectReducer as any,
    migrateFn: (v) => v,
  },
  issueProvider: {
    appDataKey: 'issueProvider',
    modelVersion: 99,
    reducerFn: issueProviderReducer,
    migrateFn: (v) => v,
  },
  tag: {
    appDataKey: 'tag',
    modelVersion: 99,
    reducerFn: tagReducer,
    migrateFn: (v) => v,
  },
  simpleCounter: {
    appDataKey: 'simpleCounter',
    modelVersion: 99,
    reducerFn: simpleCounterReducer,
    migrateFn: (v) => v,
  },
  note: {
    appDataKey: 'note',
    modelVersion: 99,
    reducerFn: noteReducer,
    migrateFn: (v) => v,
  },

  // METRIC MODELS
  metric: {
    appDataKey: 'metric',
    modelVersion: 99,
    reducerFn: metricReducer as any,
    migrateFn: (v) => v,
  },
  // TODO: Remove improvement and obstruction in future version after data migration
  // These are kept for backward compatibility with existing data
  improvement: {
    appDataKey: 'improvement',
    modelVersion: 99,
    reducerFn: improvementReducer,
    migrateFn: (v) => v,
  },

  obstruction: {
    appDataKey: 'obstruction',
    modelVersion: 99,
    reducerFn: obstructionReducer as any,
    migrateFn: (v) => v,
  },

  // MAIN TASK MODELS
  task: {
    appDataKey: 'task',
    modelVersion: 99,
    reducerFn: taskReducer,
    migrateFn: (v) => v,
  },
  taskArchive: {
    appDataKey: 'taskArchive',
    modelVersion: 99,
    reducerFn: taskReducer as any,
    migrateFn: (v) => v,
  },
  taskRepeatCfg: {
    appDataKey: 'taskRepeatCfg',
    modelVersion: 99,
    reducerFn: taskRepeatCfgReducer as any,
    migrateFn: (v) => v,
  },
};

// TODO remove later
export const ALL_ENTITY_MODEL_KEYS: (keyof AppBaseData)[] = Object.entries(
  ENTITY_MODEL_CFGS,
)
  .map(([, entry]) => entry.appDataKey)
  .filter((key) => key !== 'taskArchive');

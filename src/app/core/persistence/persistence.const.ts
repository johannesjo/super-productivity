import { PersistenceBaseModelCfg, PersistenceEntityModelCfg } from './persistence.model';
import { GlobalConfigState } from '../../features/config/global-config.model';
import { migrateGlobalConfigState } from '../../features/config/migrate-global-config.util';
import { Reminder } from '../../features/reminder/reminder.model';
import { Project, ProjectState } from '../../features/project/project.model';
import { projectReducer } from '../../features/project/store/project.reducer';
import { migrateProjectState } from '../../features/project/migrate-projects-state.util';
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
  migrateImprovementState,
  migrateMetricState,
  migrateObstructionState,
} from '../../features/metric/migrate-metric-states.util';
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
  migrateTaskArchiveState,
  migrateTaskState,
} from '../../features/tasks/migrate-task-state.util';
import {
  TaskRepeatCfg,
  TaskRepeatCfgState,
} from '../../features/task-repeat-cfg/task-repeat-cfg.model';
import { taskRepeatCfgReducer } from '../../features/task-repeat-cfg/store/task-repeat-cfg.reducer';
import { migrateTaskRepeatCfgState } from '../../features/task-repeat-cfg/migrate-task-repeat-cfg-state.util';
import { MODEL_VERSION } from '../model-version';
import { migrateSimpleCounterState } from '../../features/simple-counter/migrate-simple-counter-state.util';
import { migrateTagState } from '../../features/tag/migrate-tag-state.util';
import { migrateNoteState } from '../../features/note/migrate-note-state.util';
import { AppBaseData } from '../../imex/sync/sync.model';
import { PlannerState } from '../../features/planner/store/planner.reducer';
import { IssueProvider, IssueProviderState } from '../../features/issue/issue.model';
import { issueProviderReducer } from '../../features/issue/store/issue-provider.reducer';
import { migrateIssueProviderState } from '../../features/issue/migrate-issue-providers';
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
    modelVersion: MODEL_VERSION.GLOBAL_CONFIG,
    migrateFn: migrateGlobalConfigState,
  },
  reminders: {
    appDataKey: 'reminders',
    modelVersion: MODEL_VERSION.___NOT_USED_YET___,
    // no migrations needed yet
    migrateFn: (s: Reminder[]) => s,
  },
  planner: {
    appDataKey: 'planner',
    modelVersion: MODEL_VERSION.___NOT_USED_YET___,
    // no migrations needed yet
    migrateFn: (s: PlannerState): PlannerState => s,
  },
  boards: {
    appDataKey: 'boards',
    modelVersion: MODEL_VERSION.___NOT_USED_YET___,
    // no migrations needed yet
    migrateFn: (s: BoardsState): BoardsState => s,
  },
};

export const ENTITY_MODEL_CFGS: PersistenceEntityModelCfgs = {
  project: {
    appDataKey: 'project',
    modelVersion: MODEL_VERSION.PROJECT,
    reducerFn: projectReducer as any,
    migrateFn: migrateProjectState,
  },
  issueProvider: {
    appDataKey: 'issueProvider',
    modelVersion: MODEL_VERSION.ISSUE_PROVIDER,
    reducerFn: issueProviderReducer,
    migrateFn: migrateIssueProviderState,
  },
  tag: {
    appDataKey: 'tag',
    modelVersion: MODEL_VERSION.TAG,
    reducerFn: tagReducer,
    migrateFn: migrateTagState,
  },
  simpleCounter: {
    appDataKey: 'simpleCounter',
    modelVersion: MODEL_VERSION.SIMPLE_COUNTER,
    reducerFn: simpleCounterReducer,
    migrateFn: migrateSimpleCounterState,
  },
  note: {
    appDataKey: 'note',
    modelVersion: MODEL_VERSION.NOTE,
    reducerFn: noteReducer,
    migrateFn: migrateNoteState,
  },

  // METRIC MODELS
  metric: {
    appDataKey: 'metric',
    modelVersion: MODEL_VERSION.METRIC,
    reducerFn: metricReducer as any,
    migrateFn: migrateMetricState,
  },
  improvement: {
    appDataKey: 'improvement',
    modelVersion: MODEL_VERSION.___NOT_USED_YET___,
    reducerFn: improvementReducer,
    migrateFn: migrateImprovementState,
  },

  obstruction: {
    appDataKey: 'obstruction',
    modelVersion: MODEL_VERSION.___NOT_USED_YET___,
    reducerFn: obstructionReducer as any,
    migrateFn: migrateObstructionState,
  },

  // MAIN TASK MODELS
  task: {
    appDataKey: 'task',
    modelVersion: MODEL_VERSION.TASK,
    reducerFn: taskReducer,
    migrateFn: migrateTaskState,
  },
  taskArchive: {
    appDataKey: 'taskArchive',
    modelVersion: MODEL_VERSION.TASK_ARCHIVE,
    reducerFn: taskReducer as any,
    migrateFn: migrateTaskArchiveState,
  },
  taskRepeatCfg: {
    appDataKey: 'taskRepeatCfg',
    modelVersion: MODEL_VERSION.TASK_REPEAT,
    reducerFn: taskRepeatCfgReducer as any,
    migrateFn: migrateTaskRepeatCfgState,
  },
};

// TODO remove later
export const ALL_ENTITY_MODEL_KEYS: (keyof AppBaseData)[] = Object.entries(
  ENTITY_MODEL_CFGS,
)
  .map(([, entry]) => entry.appDataKey)
  .filter((key) => key !== 'taskArchive');

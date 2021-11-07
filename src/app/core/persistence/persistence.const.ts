import {
  PersistenceBaseModelCfg,
  PersistenceEntityModelCfg,
  PersistenceProjectModelCfg,
} from './persistence.model';
import { GlobalConfigState } from '../../features/config/global-config.model';
import {
  LS_BOOKMARK_STATE,
  LS_GLOBAL_CFG,
  LS_IMPROVEMENT_STATE,
  LS_METRIC_STATE,
  LS_NOTE_STATE,
  LS_OBSTRUCTION_STATE,
  LS_PROJECT_META_LIST,
  LS_REMINDER,
  LS_SIMPLE_COUNTER_STATE,
  LS_TAG_STATE,
  LS_TASK_ARCHIVE,
  LS_TASK_REPEAT_CFG_STATE,
  LS_TASK_STATE,
} from './ls-keys.const';
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
import { Bookmark, BookmarkState } from '../../features/bookmark/bookmark.model';

interface PersistenceBaseModelCfgs {
  // [key: string]: PersistenceBaseModelCfg<any>;
  globalConfig: PersistenceBaseModelCfg<GlobalConfigState>;
  reminders: PersistenceBaseModelCfg<Reminder[]>;
}

interface PersistenceEntityModelCfgs {
  project: PersistenceEntityModelCfg<ProjectState, Project>;
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

interface PersistenceProjectModelCfgs {
  bookmark: PersistenceProjectModelCfg<BookmarkState, Bookmark>;
}

export const BASE_MODEL_CFGS: PersistenceBaseModelCfgs = {
  globalConfig: {
    lsKey: LS_GLOBAL_CFG,
    appDataKey: 'globalConfig',
    migrateFn: migrateGlobalConfigState,
  },
  reminders: {
    lsKey: LS_REMINDER,
    appDataKey: 'reminders',
  },
};

export const ENTITY_MODEL_CFGS: PersistenceEntityModelCfgs = {
  project: {
    lsKey: LS_PROJECT_META_LIST,
    appDataKey: 'project',
    reducerFn: projectReducer as any,
    migrateFn: migrateProjectState,
  },

  tag: {
    lsKey: LS_TAG_STATE,
    appDataKey: 'tag',
    reducerFn: tagReducer,
  },
  simpleCounter: {
    lsKey: LS_SIMPLE_COUNTER_STATE,
    appDataKey: 'simpleCounter',
    reducerFn: simpleCounterReducer,
  },
  note: {
    lsKey: LS_NOTE_STATE,
    appDataKey: 'note',
    reducerFn: noteReducer,
  },

  // METRIC MODELS
  metric: {
    lsKey: LS_METRIC_STATE,
    appDataKey: 'metric',
    reducerFn: metricReducer as any,
    migrateFn: migrateMetricState,
  },
  improvement: {
    lsKey: LS_IMPROVEMENT_STATE,
    appDataKey: 'improvement',
    reducerFn: improvementReducer,
    migrateFn: migrateImprovementState,
  },

  obstruction: {
    lsKey: LS_OBSTRUCTION_STATE,
    appDataKey: 'obstruction',
    reducerFn: obstructionReducer as any,
    migrateFn: migrateObstructionState,
  },

  // MAIN TASK MODELS
  task: {
    lsKey: LS_TASK_STATE,
    appDataKey: 'task',
    reducerFn: taskReducer,
    migrateFn: migrateTaskState,
  },
  taskArchive: {
    lsKey: LS_TASK_ARCHIVE,
    appDataKey: 'taskArchive',
    reducerFn: taskReducer as any,
    migrateFn: migrateTaskArchiveState,
  },
  taskRepeatCfg: {
    lsKey: LS_TASK_REPEAT_CFG_STATE,
    appDataKey: 'taskRepeatCfg',
    reducerFn: taskRepeatCfgReducer as any,
    migrateFn: migrateTaskRepeatCfgState,
  },
};

export const PROJECT_MODEL_CFGS: PersistenceProjectModelCfgs = {
  bookmark: { lsKey: LS_BOOKMARK_STATE, appDataKey: 'bookmark' },
};

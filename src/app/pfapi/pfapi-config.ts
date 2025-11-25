import {
  AllModelData,
  DataRepairNotPossibleError,
  Dropbox,
  ModelCfg,
  PfapiBaseCfg,
} from './api';
import { ProjectState } from '../features/project/project.model';
import { MenuTreeState } from '../features/menu-tree/store/menu-tree.model';
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
import { TaskState } from '../features/tasks/task.model';
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
import { isDataRepairPossible } from './repair/is-data-repair-possible.util';
import {
  getLastValidityError,
  isRelatedModelDataValid,
} from './validate/is-related-model-data-valid';
import { dataRepair } from './repair/data-repair';
import { LocalFileSyncElectron } from './api/sync/providers/local-file-sync/local-file-sync-electron';
import { IS_ELECTRON } from '../app.constants';
import { IS_ANDROID_WEB_VIEW } from '../util/is-android-web-view';
import { LocalFileSyncAndroid } from './api/sync/providers/local-file-sync/local-file-sync-android';
import { environment } from '../../environments/environment';
import {
  ArchiveModel,
  TimeTrackingState,
} from '../features/time-tracking/time-tracking.model';
import { initialTimeTrackingState } from '../features/time-tracking/store/time-tracking.reducer';
import { CROSS_MODEL_MIGRATIONS } from './migrate/cross-model-migrations';
import { appDataValidators, validateAllData } from './validate/validation-fn';
import { fixEntityStateConsistency } from '../util/check-fix-entity-state-consistency';
import { IValidation } from 'typia';
import { PFLog } from '../core/log';
import {
  initialPluginMetaDataState,
  initialPluginUserDataState,
  PluginMetaDataState,
  PluginUserDataState,
} from '../plugins/plugin-persistence.model';
import { menuTreeInitialState } from '../features/menu-tree/store/menu-tree.reducer';

export const CROSS_MODEL_VERSION = 4.4 as const;

export type PfapiAllModelCfg = {
  project: ModelCfg<ProjectState>;
  menuTree: ModelCfg<MenuTreeState>;
  globalConfig: ModelCfg<GlobalConfigState>;
  planner: ModelCfg<PlannerState>;
  boards: ModelCfg<BoardsState>;
  note: ModelCfg<NoteState>;
  issueProvider: ModelCfg<IssueProviderState>;

  // Metric models
  metric: ModelCfg<MetricState>;
  // TODO: Remove improvement and obstruction in future version after data migration
  improvement: ModelCfg<ImprovementState>;
  obstruction: ModelCfg<ObstructionState>;

  task: ModelCfg<TaskState>;
  tag: ModelCfg<TagState>;
  simpleCounter: ModelCfg<SimpleCounterState>;
  taskRepeatCfg: ModelCfg<TaskRepeatCfgState>;

  reminders: ModelCfg<Reminder[]>;

  timeTracking: ModelCfg<TimeTrackingState>;

  pluginUserData: ModelCfg<PluginUserDataState | undefined>;
  pluginMetadata: ModelCfg<PluginMetaDataState | undefined>;

  archiveYoung: ModelCfg<ArchiveModel>;
  archiveOld: ModelCfg<ArchiveModel>;
};
export type AppDataCompleteNew = AllModelData<PfapiAllModelCfg>;

export const PFAPI_MODEL_CFGS: PfapiAllModelCfg = {
  task: {
    defaultData: initialTaskState,
    isMainFileModel: true,
    validate: appDataValidators.task,
    repair: fixEntityStateConsistency,
  },
  timeTracking: {
    defaultData: initialTimeTrackingState,
    isMainFileModel: true,
    validate: appDataValidators.timeTracking,
  },

  project: {
    defaultData: initialProjectState,
    isMainFileModel: true,
    validate: appDataValidators.project,
    repair: fixEntityStateConsistency,
  },
  tag: {
    defaultData: initialTagState,
    isMainFileModel: true,
    validate: appDataValidators.tag,
    repair: fixEntityStateConsistency,
  },
  simpleCounter: {
    defaultData: initialSimpleCounterState,
    isMainFileModel: true,
    validate: appDataValidators.simpleCounter,
    repair: fixEntityStateConsistency,
  },
  note: {
    defaultData: initialNoteState,
    isMainFileModel: true,
    validate: appDataValidators.note,
    repair: fixEntityStateConsistency,
  },
  taskRepeatCfg: {
    defaultData: initialTaskRepeatCfgState,
    // TODO check if still necessary
    // needs to be due to last creation data being saved to model
    isMainFileModel: true,
    validate: appDataValidators.taskRepeatCfg,
    repair: fixEntityStateConsistency,
  },
  reminders: {
    defaultData: [],
    isMainFileModel: true,
    validate: appDataValidators.reminders,
  },
  planner: {
    defaultData: plannerInitialState,
    isMainFileModel: true,
    validate: appDataValidators.planner,
  },
  boards: {
    defaultData: initialBoardsState,
    isMainFileModel: true,
    validate: appDataValidators.boards,
  },
  // we put it in main file model because it is likely as notes to get changed
  menuTree: {
    defaultData: menuTreeInitialState,
    validate: appDataValidators.menuTree,
  },

  //-------------------------------

  pluginUserData: {
    defaultData: initialPluginUserDataState,
    validate: appDataValidators.pluginUserData,
  },
  pluginMetadata: {
    defaultData: initialPluginMetaDataState,
    validate: appDataValidators.pluginMetadata,
  },

  //-------------------------------
  globalConfig: {
    defaultData: DEFAULT_GLOBAL_CONFIG,
    validate: appDataValidators.globalConfig,
  },

  issueProvider: {
    defaultData: issueProviderInitialState,
    validate: appDataValidators.issueProvider,
    repair: fixEntityStateConsistency,
  },

  // Metric models
  metric: {
    defaultData: initialMetricState,
    validate: appDataValidators.metric,
    repair: fixEntityStateConsistency,
  },
  improvement: {
    defaultData: initialImprovementState,
    validate: appDataValidators.improvement,
    repair: fixEntityStateConsistency,
  },
  obstruction: {
    defaultData: initialObstructionState,
    validate: appDataValidators.obstruction,
    repair: fixEntityStateConsistency,
  },

  archiveYoung: {
    defaultData: {
      task: { ids: [], entities: {} },
      timeTracking: initialTimeTrackingState,
      lastTimeTrackingFlush: 0,
    },
    validate: appDataValidators.archiveYoung,
    repair: (d) => {
      return {
        ...d,
        task: fixEntityStateConsistency(d.task),
      };
    },
  },
  archiveOld: {
    defaultData: {
      task: { ids: [], entities: {} },
      timeTracking: initialTimeTrackingState,
      lastTimeTrackingFlush: 0,
    },
    validate: appDataValidators.archiveOld,
    repair: (d) => {
      return {
        ...d,
        task: fixEntityStateConsistency(d.task),
      };
    },
  },
} as const;

export const fileSyncElectron = new LocalFileSyncElectron();
export const fileSyncDroid = new LocalFileSyncAndroid();

export const PFAPI_SYNC_PROVIDERS = [
  new Dropbox({
    appKey: DROPBOX_APP_KEY,
    basePath: environment.production ? `/` : `/DEV/`,
  }),
  new Webdav(environment.production ? undefined : `/DEV`),
  ...(IS_ELECTRON ? [fileSyncElectron] : []),
  ...(IS_ANDROID_WEB_VIEW ? [fileSyncDroid] : []),
];

export const PFAPI_CFG: PfapiBaseCfg<PfapiAllModelCfg> = {
  crossModelVersion: CROSS_MODEL_VERSION,
  validate: (data) => {
    // console.time('validateAllData');
    const r = validateAllData(data);

    if (!environment.production && !r.success) {
      PFLog.log(r);
      alert('VALIDATION ERROR ');
    }

    // console.time('relatedDataValidation');
    if (r.success && !isRelatedModelDataValid(data)) {
      return {
        success: false,
        data,
        errors: [
          {
            expected: getLastValidityError() || 'Valid Cross Model Relations',
            path: '.',
            value: data,
          },
        ],
      };
    }
    // console.timeEnd('relatedDataValidation');
    // console.timeEnd('validateAllData');
    return r;
  },
  onDbError: (err) => {
    PFLog.err(err);
    alert('DB ERROR: ' + err);
  },
  repair: (data: any, errors: IValidation.IError[]) => {
    if (!isDataRepairPossible(data)) {
      throw new DataRepairNotPossibleError(data);
    }
    return dataRepair(data, errors) as AppDataCompleteNew;
  },
  crossModelMigrations: CROSS_MODEL_MIGRATIONS,
};

import { inject, Injectable } from '@angular/core';
import { AllowedDBKeys } from './storage-keys.const';
import { GlobalConfigState } from '../../features/config/global-config.model';
import {
  ArchiveTask,
  Task,
  TaskArchive,
  TaskState,
} from '../../features/tasks/task.model';
import { AppBaseData, AppDataCompleteLegacy } from '../../imex/sync/sync.model';
import { Reminder } from '../../features/reminder/reminder.model';
import { DatabaseService } from './database.service';
import { Project, ProjectState } from '../../features/project/project.model';
import {
  PersistenceBaseEntityModel,
  PersistenceBaseModelCfg,
  PersistenceEntityModelCfg,
  PersistenceLegacyBaseModel,
} from './persistence.model';
import { Metric, MetricState } from '../../features/metric/metric.model';
import {
  Improvement,
  ImprovementState,
} from '../../features/metric/improvement/improvement.model';
import {
  Obstruction,
  ObstructionState,
} from '../../features/metric/obstruction/obstruction.model';
import {
  TaskRepeatCfg,
  TaskRepeatCfgState,
} from '../../features/task-repeat-cfg/task-repeat-cfg.model';
import { Note, NoteState } from '../../features/note/note.model';
import { Action, Store } from '@ngrx/store';
import { Tag, TagState } from '../../features/tag/tag.model';
import {
  SimpleCounter,
  SimpleCounterState,
} from '../../features/simple-counter/simple-counter.model';
import { saveToDb } from './persistence.actions';
import { DEFAULT_APP_BASE_DATA } from '../../imex/sync/sync.const';
import { BASE_MODEL_CFGS, ENTITY_MODEL_CFGS } from './persistence.const';
import { PersistenceLocalService } from './persistence-local.service';
import { PlannerState } from '../../features/planner/store/planner.reducer';
import { IssueProvider, IssueProviderState } from '../../features/issue/issue.model';
import { BoardsState } from '../../features/boards/store/boards.reducer';
import { Log } from '../log';

@Injectable({
  providedIn: 'root',
})
export class PersistenceLegacyService {
  private _databaseService = inject(DatabaseService);
  private _persistenceLocalService = inject(PersistenceLocalService);
  private _store = inject<Store<any>>(Store);

  // handled as private but needs to be assigned before the creations
  _baseModels: PersistenceLegacyBaseModel<unknown>[] = [];

  // TODO auto generate ls keys from appDataKey where possible
  globalConfig: PersistenceLegacyBaseModel<GlobalConfigState> =
    this._cmBase<GlobalConfigState>(BASE_MODEL_CFGS.globalConfig);
  reminders: PersistenceLegacyBaseModel<Reminder[]> = this._cmBase<Reminder[]>(
    BASE_MODEL_CFGS.reminders,
  );
  planner: PersistenceLegacyBaseModel<PlannerState> = this._cmBase<PlannerState>(
    BASE_MODEL_CFGS.planner,
  );
  boards: PersistenceLegacyBaseModel<BoardsState> = this._cmBase<BoardsState>(
    BASE_MODEL_CFGS.boards,
  );

  project: PersistenceBaseEntityModel<ProjectState, Project> = this._cmBaseEntity<
    ProjectState,
    Project
  >(ENTITY_MODEL_CFGS.project);

  issueProvider: PersistenceBaseEntityModel<IssueProviderState, IssueProvider> =
    this._cmBaseEntity<IssueProviderState, IssueProvider>(
      ENTITY_MODEL_CFGS.issueProvider,
    );

  tag: PersistenceBaseEntityModel<TagState, Tag> = this._cmBaseEntity<TagState, Tag>(
    ENTITY_MODEL_CFGS.tag,
  );
  simpleCounter: PersistenceBaseEntityModel<SimpleCounterState, SimpleCounter> =
    this._cmBaseEntity<SimpleCounterState, SimpleCounter>(
      ENTITY_MODEL_CFGS.simpleCounter,
    );
  note: PersistenceBaseEntityModel<NoteState, Note> = this._cmBaseEntity<NoteState, Note>(
    ENTITY_MODEL_CFGS.note,
  );

  // METRIC MODELS
  metric: PersistenceBaseEntityModel<MetricState, Metric> = this._cmBaseEntity<
    MetricState,
    Metric
  >(ENTITY_MODEL_CFGS.metric);

  improvement: PersistenceBaseEntityModel<ImprovementState, Improvement> =
    this._cmBaseEntity<ImprovementState, Improvement>(ENTITY_MODEL_CFGS.improvement);
  obstruction: PersistenceBaseEntityModel<ObstructionState, Obstruction> =
    this._cmBaseEntity<ObstructionState, Obstruction>(ENTITY_MODEL_CFGS.obstruction);

  // MAIN TASK MODELS
  task: PersistenceBaseEntityModel<TaskState, Task> = this._cmBaseEntity<TaskState, Task>(
    ENTITY_MODEL_CFGS.task,
  );
  taskArchive: PersistenceBaseEntityModel<TaskArchive, ArchiveTask> = this._cmBaseEntity<
    TaskArchive,
    ArchiveTask
  >(ENTITY_MODEL_CFGS.taskArchive);
  taskRepeatCfg: PersistenceBaseEntityModel<TaskRepeatCfgState, TaskRepeatCfg> =
    this._cmBaseEntity<TaskRepeatCfgState, TaskRepeatCfg>(
      ENTITY_MODEL_CFGS.taskRepeatCfg,
    );

  private _isBlockSaving: boolean = false;

  // NOTE: not including backup
  // async loadCompleteWithPrivate(): Promise<AppDataComplete> {
  // }

  async loadComplete(): Promise<AppDataCompleteLegacy> {
    const projectState = await this.project.loadState();
    const pids = projectState ? (projectState.ids as string[]) : [];
    if (!pids) {
      throw new Error('Project State is broken');
    }

    const r = {
      ...(await this._loadAppBaseData()),
    };

    return {
      ...r,
      lastLocalSyncModelChange:
        await this._persistenceLocalService.loadLastSyncModelChange(),
      lastArchiveUpdate: await this._persistenceLocalService.loadLastArchiveChange(),
    };
  }

  async _loadAppBaseData(): Promise<AppBaseData> {
    const promises = this._baseModels.map(async (modelCfg) => {
      const modelState = await modelCfg.loadState();
      return {
        [modelCfg.appDataKey]: modelState || DEFAULT_APP_BASE_DATA[modelCfg.appDataKey],
      };
    });
    const baseDataArray: Partial<AppBaseData>[] = await Promise.all(promises);
    return Object.assign({}, ...baseDataArray);
  }

  // TODO maybe refactor to class?

  // ------------------
  private _cmBase<T extends Record<string, any>>({
    appDataKey,
    migrateFn = (v) => v,
    // NOTE: isSkipPush is used to use this for _cmBaseEntity as well
    isSkipPush = false,
  }: PersistenceBaseModelCfg<T>): PersistenceLegacyBaseModel<T> {
    const model = {
      appDataKey,
      loadState: async (isSkipMigrate = false) => {
        const modelData = await this._loadFromDb({
          dbKey: appDataKey,
        });
        return modelData
          ? isSkipMigrate
            ? modelData
            : migrateFn(modelData)
          : // we want to be sure there is always a valid value returned
            DEFAULT_APP_BASE_DATA[appDataKey];
      },
      // In case we want to check on load
      // loadState: async (isSkipMigrate = false) => {
      //   const data = isSkipMigrate
      //     ? await this._loadFromDb(lsKey)
      //     : await this._loadFromDb(lsKey).then(migrateFn);
      //   if (data && data.ids && data.entities) {
      //     checkFixEntityStateConsistency(data, appDataKey);
      //   }
      //   return data;
      // },
      saveState: (
        data: T,
        {
          isDataImport = false,
          isSyncModelChange,
        }: { isDataImport?: boolean; isSyncModelChange: boolean },
      ) => {
        // removed because of performance impact and since we deal with legacy data anyway
        // if (data && data.ids && data.entities) {
        //   data = checkFixEntityStateConsistency(data, appDataKey);
        // }
        return this._saveToDb({
          dbKey: appDataKey,
          data,
          isDataImport,
          isSyncModelChange,
        });
      },
    };
    if (!isSkipPush) {
      this._baseModels.push(model);
    }
    return model;
  }

  private _cmBaseEntity<S extends Record<string, any>, M>({
    appDataKey,
    modelVersion,
    reducerFn,
    migrateFn = (v) => v,
  }: PersistenceEntityModelCfg<S, M>): PersistenceBaseEntityModel<S, M> {
    const model = {
      // NOTE: isSkipPush is true because we do it below after
      ...this._cmBase({
        appDataKey,
        modelVersion,
        migrateFn,
        isSkipPush: true,
      }),

      getById: async (id: string): Promise<M> => {
        const state = (await model.loadState()) as any;
        return (state && state.entities && state.entities[id]) || null;
      },

      // NOTE: side effects are not executed!!!
      execAction: async (action: Action, isSyncModelChange = false): Promise<S> => {
        const state: S = await model.loadState();
        const newState: S = reducerFn(state, action);
        await model.saveState(newState, { isDataImport: false, isSyncModelChange });
        return newState;
      },

      // NOTE: side effects are not executed!!!
      execActions: async (actions: Action[], isSyncModelChange = false): Promise<S> => {
        const state: S = await model.loadState();
        const newState: S = actions.reduce((acc, act) => reducerFn(acc, act), state);
        await model.saveState(newState, { isDataImport: false, isSyncModelChange });
        return newState;
      },
    };

    this._baseModels.push(model);
    return model;
  }

  // DATA STORAGE INTERFACE
  // ---------------------
  private _getIDBKey(dbKey: AllowedDBKeys, projectId?: string): string {
    return projectId ? 'p__' + projectId + '__' + dbKey : dbKey;
  }

  private async _saveToDb({
    dbKey,
    data,
    isDataImport = false,
    projectId,
    isSyncModelChange = false,
  }: {
    dbKey: AllowedDBKeys;
    data: Record<string, any>;
    projectId?: string;
    isDataImport?: boolean;
    isSyncModelChange?: boolean;
  }): Promise<any> {
    if (!this._isBlockSaving || isDataImport === true) {
      const idbKey = this._getIDBKey(dbKey, projectId);
      this._store.dispatch(saveToDb({ dbKey, data }));
      const r = await this._databaseService.save(idbKey, data);
      const now = Date.now();

      if (isSyncModelChange) {
        await this._persistenceLocalService.updateLastSyncModelChange(now);
      }
      if (dbKey === 'taskArchive' || dbKey === 'archivedProjects') {
        await this._persistenceLocalService.updateLastArchiveChange(now);
      }

      return r;
    } else {
      Log.err('BLOCKED SAVING for ', dbKey);
      return Promise.reject('Data import currently in progress. Saving disabled');
    }
  }

  private async _loadFromDb({
    dbKey,
    projectId,
  }: {
    dbKey: AllowedDBKeys;
    projectId?: string;
  }): Promise<any> {
    const idbKey = this._getIDBKey(dbKey, projectId);
    // NOTE: too much clutter
    // this._store.dispatch(loadFromDb({dbKey}));
    // TODO remove legacy stuff
    return (await this._databaseService.load(idbKey)) || undefined;
  }
}

import { Injectable } from '@angular/core';
import {
  AllowedDBKeys,
  DB,
  DB_LEGACY,
  DB_LEGACY_PROJECT_PREFIX,
  LS,
} from './storage-keys.const';
import { GlobalConfigState } from '../../features/config/global-config.model';
import {
  ArchiveTask,
  Task,
  TaskArchive,
  TaskState,
} from '../../features/tasks/task.model';
import {
  AppBaseData,
  AppDataComplete,
  AppDataForProjects,
} from '../../imex/sync/sync.model';
import { Reminder } from '../../features/reminder/reminder.model';
import { DatabaseService } from './database.service';
import {
  ExportedProject,
  ProjectArchive,
  ProjectArchivedRelatedData,
} from '../../features/project/project-archive.model';
import { Project, ProjectState } from '../../features/project/project.model';
import { CompressionService } from '../compression/compression.service';
import {
  PersistenceBaseEntityModel,
  PersistenceBaseModel,
  PersistenceBaseModelCfg,
  PersistenceEntityModelCfg,
  PersistenceForProjectModel,
  PersistenceProjectModelCfg,
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
import { Bookmark, BookmarkState } from '../../features/bookmark/bookmark.model';
import { Note, NoteState } from '../../features/note/note.model';
import { Action, Store } from '@ngrx/store';
import { Tag, TagState } from '../../features/tag/tag.model';
import { checkFixEntityStateConsistency } from '../../util/check-fix-entity-state-consistency';
import {
  SimpleCounter,
  SimpleCounterState,
} from '../../features/simple-counter/simple-counter.model';
import { Subject } from 'rxjs';
import { devError } from '../../util/dev-error';
import { removeFromDb, saveToDb } from './persistence.actions';
import { crossModelMigrations } from './cross-model-migrations';
import { DEFAULT_APP_BASE_DATA } from '../../imex/sync/sync.const';
import { isValidAppData } from '../../imex/sync/is-valid-app-data.util';
import {
  BASE_MODEL_CFGS,
  ENTITY_MODEL_CFGS,
  PROJECT_MODEL_CFGS,
} from './persistence.const';

const MAX_INVALID_DATA_ATTEMPTS = 10;

@Injectable({
  providedIn: 'root',
})
export class PersistenceService {
  // handled as private but needs to be assigned before the creations
  _baseModels: PersistenceBaseModel<unknown>[] = [];
  _projectModels: PersistenceForProjectModel<unknown, unknown>[] = [];

  // TODO auto generate ls keys from appDataKey where possible
  globalConfig: PersistenceBaseModel<GlobalConfigState> = this._cmBase<GlobalConfigState>(
    BASE_MODEL_CFGS.globalConfig,
  );
  reminders: PersistenceBaseModel<Reminder[]> = this._cmBase<Reminder[]>(
    BASE_MODEL_CFGS.reminders,
  );

  project: PersistenceBaseEntityModel<ProjectState, Project> = this._cmBaseEntity<
    ProjectState,
    Project
  >(ENTITY_MODEL_CFGS.project);

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

  // PROJECT MODELS
  bookmark: PersistenceForProjectModel<BookmarkState, Bookmark> = this._cmProject<
    BookmarkState,
    Bookmark
  >(PROJECT_MODEL_CFGS.bookmark);

  onAfterSave$: Subject<{
    appDataKey: AllowedDBKeys;
    data: unknown;
    isDataImport: boolean;
    isSyncModelChange: boolean;
    projectId?: string;
  }> = new Subject();

  private _isBlockSaving: boolean = false;
  private _invalidDataCount = 0;

  constructor(
    private _databaseService: DatabaseService,
    private _compressionService: CompressionService,
    private _store: Store<any>,
  ) {}

  async getValidCompleteData(): Promise<AppDataComplete> {
    const d = await this.loadComplete();
    // if we are very unlucky (e.g. a task has updated but not the related tag changes) app data might not be valid. we never want to sync that! :)
    if (isValidAppData(d)) {
      this._invalidDataCount = 0;
      return d;
    } else {
      // TODO remove as this is not a real error, and this is just a test to check if this ever occurs
      devError('Invalid data => RETRY getValidCompleteData');
      this._invalidDataCount++;
      if (this._invalidDataCount > MAX_INVALID_DATA_ATTEMPTS) {
        throw new Error('Unable to get valid app data');
      }
      return this.getValidCompleteData();
    }
  }

  // PROJECT ARCHIVING
  // -----------------
  async loadProjectArchive(): Promise<ProjectArchive> {
    return await this._loadFromDb({
      dbKey: 'archivedProjects',
      legacyDBKey: DB_LEGACY.PROJECT_ARCHIVE,
    });
  }

  async saveProjectArchive(
    data: ProjectArchive,
    isDataImport: boolean = false,
  ): Promise<unknown> {
    return await this._saveToDb({
      dbKey: 'archivedProjects',
      data,
      isDataImport,
      isSyncModelChange: false,
    });
  }

  async loadArchivedProject(projectId: string): Promise<ProjectArchivedRelatedData> {
    const archive = await this._loadFromDb({
      dbKey: 'project',
      legacyDBKey: DB_LEGACY.PROJECT_ARCHIVE,
      projectId,
    });
    const projectDataCompressed = archive[projectId];
    const decompressed = await this._compressionService.decompress(projectDataCompressed);
    const parsed = JSON.parse(decompressed);
    console.log(
      `Decompressed project, size before: ${projectDataCompressed.length}, size after: ${decompressed.length}`,
      parsed,
    );
    return parsed;
  }

  async removeArchivedProject(projectId: string): Promise<void> {
    const archive = await this._loadFromDb({
      dbKey: 'archivedProjects',
      legacyDBKey: DB_LEGACY.PROJECT_ARCHIVE,
    });
    delete archive[projectId];
    await this.saveProjectArchive(archive);
  }

  async saveArchivedProject(
    projectId: string,
    archivedProject: ProjectArchivedRelatedData,
  ): Promise<unknown> {
    const current = (await this.loadProjectArchive()) || {};
    const jsonStr = JSON.stringify(archivedProject);
    const compressedData = await this._compressionService.compress(jsonStr);
    console.log(
      `Compressed project, size before: ${jsonStr.length}, size after: ${compressedData.length}`,
      archivedProject,
    );
    return this.saveProjectArchive({
      ...current,
      [projectId]: compressedData,
    });
  }

  async loadCompleteProject(projectId: string): Promise<ExportedProject> {
    const allProjects = await this.project.loadState();
    if (!allProjects.entities[projectId]) {
      throw new Error('Project not found');
    }
    return {
      ...(allProjects.entities[projectId] as Project),
      relatedModels: await this.loadAllRelatedModelDataForProject(projectId),
    };
  }

  async loadAllRelatedModelDataForProject(
    projectId: string,
  ): Promise<ProjectArchivedRelatedData> {
    const forProjectsData = await Promise.all(
      this._projectModels.map(async (modelCfg) => {
        return {
          [modelCfg.appDataKey]: await modelCfg.load(projectId),
        };
      }),
    );
    const projectData = Object.assign({}, ...forProjectsData);
    return {
      ...projectData,
    };
  }

  async removeCompleteRelatedDataForProject(projectId: string): Promise<void> {
    await Promise.all(
      this._projectModels.map((modelCfg) => {
        return modelCfg.remove(projectId);
      }),
    );
  }

  async restoreCompleteRelatedDataForProject(
    projectId: string,
    data: ProjectArchivedRelatedData,
  ): Promise<void> {
    await Promise.all(
      this._projectModels.map((modelCfg) => {
        return modelCfg.save(projectId, data[modelCfg.appDataKey], {});
      }),
    );
  }

  async archiveProject(projectId: string): Promise<void> {
    const projectData = await this.loadAllRelatedModelDataForProject(projectId);
    await this.saveArchivedProject(projectId, projectData);
    await this.removeCompleteRelatedDataForProject(projectId);
  }

  async unarchiveProject(projectId: string): Promise<void> {
    const projectData = await this.loadArchivedProject(projectId);
    await this.restoreCompleteRelatedDataForProject(projectId, projectData);
    await this.removeArchivedProject(projectId);
  }

  // BACKUP AND SYNC RELATED
  // -----------------------
  updateLastLocalSyncModelChange(date: number = Date.now()): void {
    // if (!environment || !environment.production) {
    //   console.log('Save Last Local Sync Model Change', date);
    // }
    localStorage.setItem(LS.LAST_LOCAL_SYNC_MODEL_CHANGE, date.toString());
  }

  getLastLocalSyncModelChange(): number | null {
    const la = localStorage.getItem(LS.LAST_LOCAL_SYNC_MODEL_CHANGE);
    // NOTE: we need to parse because new Date('1570549698000') is "Invalid Date"
    const laParsed = Number.isNaN(Number(la)) ? la : +(la as string);

    if (laParsed === null || laParsed === 0) {
      return null;
    }

    // NOTE: to account for legacy string dates
    return new Date(laParsed).getTime();
  }

  async loadBackup(): Promise<AppDataComplete> {
    return this._loadFromDb({ dbKey: DB.BACKUP, legacyDBKey: DB.BACKUP });
  }

  async saveBackup(backup?: AppDataComplete): Promise<unknown> {
    const data: AppDataComplete = backup || (await this.loadComplete());
    return this._saveToDb({
      dbKey: DB.BACKUP,
      data,
      isDataImport: true,
      isSyncModelChange: true,
    });
  }

  async clearBackup(): Promise<unknown> {
    return this._removeFromDb({ dbKey: DB.BACKUP });
  }

  // NOTE: not including backup
  // async loadCompleteWithPrivate(): Promise<AppDataComplete> {
  // }

  async loadComplete(isMigrate = false): Promise<AppDataComplete> {
    console.log('LOAD COMPLETE', isMigrate);

    const projectState = await this.project.loadState();
    const pids = projectState ? (projectState.ids as string[]) : [];
    if (!pids) {
      throw new Error('Project State is broken');
    }

    const r = isMigrate
      ? crossModelMigrations({
          ...(await this._loadAppDataForProjects(pids)),
          ...(await this._loadAppBaseData()),
        } as AppDataComplete)
      : {
          ...(await this._loadAppDataForProjects(pids)),
          ...(await this._loadAppBaseData()),
        };

    return {
      ...r,
      lastLocalSyncModelChange: this.getLastLocalSyncModelChange(),
    };
  }

  async importComplete(data: AppDataComplete): Promise<unknown> {
    console.log('IMPORT--->', data);
    this._isBlockSaving = true;

    const forBase = Promise.all(
      this._baseModels.map(async (modelCfg: PersistenceBaseModel<any>) => {
        return await modelCfg.saveState(data[modelCfg.appDataKey], {
          isDataImport: true,
        });
      }),
    );
    const forProject = Promise.all(
      this._projectModels.map(async (modelCfg: PersistenceForProjectModel<any, any>) => {
        if (!data[modelCfg.appDataKey]) {
          devError(
            'No data for ' + modelCfg.appDataKey + ' - ' + data[modelCfg.appDataKey],
          );
          return;
        }
        return await this._saveForProjectIds(data[modelCfg.appDataKey], modelCfg, true);
      }),
    );

    if (typeof data.lastLocalSyncModelChange !== 'number') {
      // not necessarily a critical error as there might be other reasons for this error to popup
      devError('No lastLocalSyncModelChange for imported data');
      data.lastLocalSyncModelChange = Date.now();
    }

    return await Promise.all([forBase, forProject])
      .then(() => {
        this.updateLastLocalSyncModelChange(data.lastLocalSyncModelChange as number);
      })
      .finally(() => {
        this._isBlockSaving = false;
      });
  }

  async clearDatabaseExceptBackup(): Promise<void> {
    const backup: AppDataComplete = await this.loadBackup();
    await this._databaseService.clearDatabase();
    if (backup) {
      await this.saveBackup(backup);
    }
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
    legacyKey,
    appDataKey,
    migrateFn = (v) => v,
    // NOTE: isSkipPush is used to use this for _cmBaseEntity as well
    isSkipPush = false,
  }: PersistenceBaseModelCfg<T>): PersistenceBaseModel<T> {
    const model = {
      appDataKey,
      loadState: async (isSkipMigrate = false) => {
        const modelData = await this._loadFromDb({
          dbKey: appDataKey,
          legacyDBKey: legacyKey,
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
        if (data && data.ids && data.entities) {
          data = checkFixEntityStateConsistency(data, appDataKey);
        }
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
    legacyKey,
    appDataKey,
    modelVersion,
    reducerFn,
    migrateFn = (v) => v,
  }: PersistenceEntityModelCfg<S, M>): PersistenceBaseEntityModel<S, M> {
    const model = {
      // NOTE: isSkipPush is true because we do it below after
      ...this._cmBase({
        legacyKey: legacyKey,
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
      execAction: async (action: Action): Promise<S> => {
        const state: S = await model.loadState();
        const newState: S = reducerFn(state, action);
        await model.saveState(newState, { isDataImport: false });
        return newState;
      },

      // NOTE: side effects are not executed!!!
      execActions: async (actions: Action[]): Promise<S> => {
        const state: S = await model.loadState();
        const newState: S = actions.reduce((acc, act) => reducerFn(acc, act), state);
        await model.saveState(newState, { isDataImport: false });
        return newState;
      },
    };

    this._baseModels.push(model);
    return model;
  }

  private _cmProject<S extends Record<string, any>, M>({
    legacyKey,
    appDataKey,
  }: // migrateFn = (v) => v,
  PersistenceProjectModelCfg<S, M>): PersistenceForProjectModel<S, M> {
    const model = {
      appDataKey,
      load: (projectId: string): Promise<S> =>
        this._loadFromDb({
          dbKey: appDataKey,
          projectId,
          legacyDBKey: this._makeLegacyProjectKey(projectId, legacyKey),
        }),
      // }).then((v) => migrateFn(v, projectId)),
      save: (
        projectId: string,
        data: Record<string, any>,
        {
          isDataImport = false,
          isSyncModelChange,
        }: { isDataImport?: boolean; isSyncModelChange?: boolean },
      ) =>
        this._saveToDb({
          dbKey: appDataKey,
          data,
          isDataImport,
          projectId,
          isSyncModelChange,
        }),
      remove: (projectId: string) => this._removeFromDb({ dbKey: appDataKey, projectId }),
      ent: {
        getById: async (projectId: string, id: string): Promise<M> => {
          const state = (await model.load(projectId)) as any;
          return (state && state.entities && state.entities[id]) || null;
        },
      },
    };
    this._projectModels.push(model);
    return model;
  }

  private async _loadAppDataForProjects(
    projectIds: string[],
  ): Promise<AppDataForProjects> {
    const forProjectsData = await Promise.all(
      this._projectModels.map(async (modelCfg) => {
        const modelState = await this._loadForProjectIds(projectIds, modelCfg.load);
        return {
          [modelCfg.appDataKey]: modelState,
        };
      }),
    );
    return Object.assign({}, ...forProjectsData);
  }

  // eslint-disable-next-line
  private async _loadForProjectIds(pids: string[], getDataFn: Function): Promise<any> {
    return await pids.reduce(async (acc, projectId) => {
      const prevAcc = await acc;
      const dataForProject = await getDataFn(projectId);
      return {
        ...prevAcc,
        [projectId]: dataForProject,
      };
    }, Promise.resolve({}));
  }

  // eslint-disable-next-line
  private async _saveForProjectIds(
    data: any,
    projectModel: PersistenceForProjectModel<unknown, unknown>,
    isDataImport = false,
  ) {
    const promises: Promise<any>[] = [];
    Object.keys(data).forEach((projectId) => {
      if (data[projectId]) {
        promises.push(projectModel.save(projectId, data[projectId], { isDataImport }));
      }
    });
    return await Promise.all(promises);
  }

  private _makeLegacyProjectKey(
    projectId: string,
    subKey: string,
    additional?: string,
  ): string {
    return (
      DB_LEGACY_PROJECT_PREFIX +
      projectId +
      '_' +
      subKey +
      (additional ? '_' + additional : '')
    );
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

      if (isSyncModelChange) {
        this.updateLastLocalSyncModelChange();
      }
      this.onAfterSave$.next({
        appDataKey: dbKey,
        data,
        isDataImport,
        projectId,
        isSyncModelChange,
      });

      return r;
    } else {
      console.warn('BLOCKED SAVING for ', dbKey);
      return Promise.reject('Data import currently in progress. Saving disabled');
    }
  }

  private async _removeFromDb({
    dbKey,
    isDataImport = false,
    projectId,
  }: {
    dbKey: AllowedDBKeys;
    projectId?: string;
    isDataImport?: boolean;
  }): Promise<any> {
    const idbKey = this._getIDBKey(dbKey, projectId);
    if (!this._isBlockSaving || isDataImport === true) {
      this._store.dispatch(removeFromDb({ dbKey }));
      return this._databaseService.remove(idbKey);
    } else {
      console.warn('BLOCKED SAVING for ', dbKey);
      return Promise.reject('Data import currently in progress. Removing disabled');
    }
  }

  private async _loadFromDb({
    legacyDBKey,
    dbKey,
    projectId,
  }: {
    legacyDBKey: string;
    dbKey: AllowedDBKeys;
    projectId?: string;
  }): Promise<any> {
    const idbKey = this._getIDBKey(dbKey, projectId);
    // NOTE: too much clutter
    // this._store.dispatch(loadFromDb({dbKey}));
    // TODO remove legacy stuff
    return (
      (await this._databaseService.load(idbKey)) ||
      (await this._databaseService.load(legacyDBKey)) ||
      undefined
    );
  }
}

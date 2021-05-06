import { ProjectState } from '../../features/project/store/project.reducer';
import {
  LS_BOOKMARK_STATE,
  LS_GLOBAL_CFG,
  LS_IMPROVEMENT_STATE,
  LS_LAST_LOCAL_SYNC_MODEL_CHANGE,
  LS_METRIC_STATE,
  LS_NOTE_STATE,
  LS_OBSTRUCTION_STATE,
  LS_PROJECT_META_LIST,
  LS_PROJECT_PREFIX,
  LS_REMINDER,
  LS_TASK_ARCHIVE,
  LS_TASK_ATTACHMENT_STATE,
  LS_TASK_REPEAT_CFG_STATE,
  LS_TASK_STATE,
} from '../persistence/ls-keys.const';
import { migrateProjectState } from '../../features/project/migrate-projects-state.util';
import { GlobalConfigState } from '../../features/config/global-config.model';
import { migrateGlobalConfigState } from '../../features/config/migrate-global-config.util';
import {
  Task,
  TaskArchive,
  TaskState,
  TaskWithSubTasks,
} from 'src/app/features/tasks/task.model';
import { Reminder } from '../../features/reminder/reminder.model';
import { taskReducer } from '../../features/tasks/store/task.reducer';
import {
  TaskRepeatCfg,
  TaskRepeatCfgState,
} from '../../features/task-repeat-cfg/task-repeat-cfg.model';
import { taskRepeatCfgReducer } from '../../features/task-repeat-cfg/store/task-repeat-cfg.reducer';
import { EntityState } from '@ngrx/entity';
import { TaskAttachment } from '../../features/tasks/task-attachment/task-attachment.model';
import {
  LegacyAppBaseData,
  LegacyAppDataComplete,
  LegacyAppDataForProjects,
  LegacyPersistenceBaseModel,
  LegacyPersistenceForProjectModel,
} from './legacy-models';
import { BookmarkState } from '../../features/bookmark/store/bookmark.reducer';
import { Bookmark } from '../../features/bookmark/bookmark.model';
import { NoteState } from '../../features/note/store/note.reducer';
import { Note } from '../../features/note/note.model';
import { Metric, MetricState } from '../../features/metric/metric.model';
import {
  Improvement,
  ImprovementState,
} from '../../features/metric/improvement/improvement.model';
import {
  Obstruction,
  ObstructionState,
} from '../../features/metric/obstruction/obstruction.model';
import { DatabaseService } from '../persistence/database.service';
import { DEFAULT_PROJECT_ID } from '../../features/project/project.const';
import { Action } from '@ngrx/store';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LegacyPersistenceService {
  // handled as private but needs to be assigned before the creations
  _baseModels: any[] = [];
  _projectModels: any[] = [];

  // TODO auto generate ls keys from appDataKey where possible
  project: any = this._cmBase<ProjectState>(
    LS_PROJECT_META_LIST,
    'project',
    migrateProjectState,
  );
  globalConfig: any = this._cmBase<GlobalConfigState>(
    LS_GLOBAL_CFG,
    'globalConfig',
    migrateGlobalConfigState,
  );
  reminders: any = this._cmBase<Reminder[]>(LS_REMINDER, 'reminders');
  task: any = this._cmProject<TaskState, Task>(LS_TASK_STATE, 'task', taskReducer);
  taskRepeatCfg: any = this._cmProject<TaskRepeatCfgState, TaskRepeatCfg>(
    LS_TASK_REPEAT_CFG_STATE,
    'taskRepeatCfg',
    taskRepeatCfgReducer as any,
  );
  taskArchive: any = this._cmProject<TaskArchive, TaskWithSubTasks>(
    LS_TASK_ARCHIVE,
    'taskArchive',
    // NOTE: this might be problematic, as we don't really have reducer logic for the archive
    // TODO add a working reducer for task archive
    taskReducer as any,
  );
  taskAttachment: any = this._cmProject<EntityState<TaskAttachment>, TaskAttachment>(
    LS_TASK_ATTACHMENT_STATE,
    'taskAttachment',
    (state) => state,
  );
  bookmark: any = this._cmProject<BookmarkState, Bookmark>(
    LS_BOOKMARK_STATE,
    'bookmark',
    (state) => state,
  );
  note: any = this._cmProject<NoteState, Note>(LS_NOTE_STATE, 'note', (state) => state);
  metric: any = this._cmProject<MetricState, Metric>(
    LS_METRIC_STATE,
    'metric',
    (state) => state,
  );
  improvement: any = this._cmProject<ImprovementState, Improvement>(
    LS_IMPROVEMENT_STATE,
    'improvement',
    (state) => state,
  );
  obstruction: any = this._cmProject<ObstructionState, Obstruction>(
    LS_OBSTRUCTION_STATE,
    'obstruction',
    (state) => state,
  );
  private _isBlockSaving: boolean = false;

  constructor(private _databaseService: DatabaseService) {
    // this.loadComplete().then(d => console.log('XXXXXXXXX', d, JSON.stringify(d).length));
    // this.loadAllRelatedModelDataForProject('DEFAULT').then(d => console.log(d));
  }

  // PROJECT ARCHIVING
  // -----------------
  // async loadProjectArchive(): Promise<ProjectArchive> {
  //   return await this._loadFromDb(LS_PROJECT_ARCHIVE);
  // }
  //
  // async saveProjectArchive(data: ProjectArchive, isForce = false): Promise<any> {
  //   return await this._saveToDb(LS_PROJECT_ARCHIVE, data, isForce);
  // }
  //
  // async loadArchivedProject(projectId): Promise<ProjectArchivedRelatedData> {
  //   const archive = await this._loadFromDb(LS_PROJECT_ARCHIVE);
  //   const projectDataCompressed = archive[projectId];
  //   const decompressed = await this._compressionService.decompress(projectDataCompressed);
  //   const parsed = JSON.parse(decompressed);
  //   console.log(`Decompressed project, size before: ${projectDataCompressed.length}, size after: ${decompressed.length}`, parsed);
  //   return parsed;
  // }
  //
  // async removeArchivedProject(projectId): Promise<any> {
  //   const archive = await this._loadFromDb(LS_PROJECT_ARCHIVE);
  //   delete archive[projectId];
  //   await this.saveProjectArchive(archive);
  // }
  //
  // async saveArchivedProject(projectId, archivedProject: ProjectArchivedRelatedData) {
  //   const current = await this.loadProjectArchive() || {};
  //   const jsonStr = JSON.stringify(archivedProject);
  //   const compressedData = await this._compressionService.compress(jsonStr);
  //   console.log(`Compressed project, size before: ${jsonStr.length}, size after: ${compressedData.length}`, archivedProject);
  //   return this.saveProjectArchive({
  //     ...current,
  //     [projectId]: compressedData,
  //   });
  // }
  //
  // async loadCompleteProject(projectId: string): Promise<ExportedProject> {
  //   const allProjects = await this.project.load();
  //   return {
  //     ...allProjects.entities[projectId],
  //     relatedModels: await this.loadAllRelatedModelDataForProject(projectId),
  //   };
  // }
  //
  // async loadAllRelatedModelDataForProject(projectId: string): Promise<ProjectArchivedRelatedData> {
  //   const forProjectsData = await Promise.all(this._projectModels.map(async (modelCfg) => {
  //     return {
  //       [modelCfg.appDataKey]: await modelCfg.load(projectId),
  //     };
  //   }));
  //   const projectData = Object.assign({}, ...forProjectsData);
  //   return {
  //     ...projectData,
  //   };
  // }
  //
  // async removeCompleteRelatedDataForProject(projectId: string): Promise<any> {
  //   await Promise.all(this._projectModels.map((modelCfg) => {
  //     return modelCfg.remove(projectId);
  //   }));
  // }
  //
  // async restoreCompleteRelatedDataForProject(projectId: string, data: ProjectArchivedRelatedData): Promise<any> {
  //   await Promise.all(this._projectModels.map((modelCfg) => {
  //     return modelCfg.save(projectId, data[modelCfg.appDataKey]);
  //   }));
  // }
  //
  // async archiveProject(projectId: string): Promise<any> {
  //   const projectData = await this.loadAllRelatedModelDataForProject(projectId);
  //   await this.saveArchivedProject(projectId, projectData);
  //   await this.removeCompleteRelatedDataForProject(projectId);
  // }
  //
  // async unarchiveProject(projectId: string): Promise<any> {
  //   const projectData = await this.loadArchivedProject(projectId);
  //   await this.restoreCompleteRelatedDataForProject(projectId, projectData);
  //   await this.removeArchivedProject(projectId);
  // }

  // BACKUP AND SYNC RELATED
  // -----------------------
  getLastActive(): number {
    const la = localStorage.getItem(LS_LAST_LOCAL_SYNC_MODEL_CHANGE);
    // NOTE: we need to parse because new Date('1570549698000') is "Invalid Date"
    const laParsed = Number.isNaN(Number(la)) ? la : +(la as any);
    // NOTE: to account for legacy string dates
    return new Date(laParsed as any).getTime();
  }

  // NOTE: not including backup
  async loadCompleteLegacy(): Promise<LegacyAppDataComplete> {
    const projectState = await this.project.load();
    const pids = projectState ? (projectState.ids as string[]) : [DEFAULT_PROJECT_ID];

    return {
      lastActiveTime: this.getLastActive(),
      ...(await this._loadLegacyAppDataForProjects(pids)),
      ...(await this._loadLegacyAppBaseData()),
    };
  }

  async _loadLegacyAppBaseData(): Promise<LegacyAppBaseData> {
    const promises = this._baseModels.map(async (modelCfg) => {
      const modelState = await modelCfg.load();
      return {
        [modelCfg.appDataKey]: modelState,
      };
    });
    const baseDataArray: Partial<LegacyAppBaseData>[] = await Promise.all(promises);
    return Object.assign({}, ...baseDataArray);
  }

  // TODO maybe refactor to class?

  // ------------------
  private _cmBase<T>(
    lsKey: string,
    appDataKey: keyof LegacyAppBaseData,
    migrateFn: (state: T) => T = (v) => v,
  ): LegacyPersistenceBaseModel<T> {
    const model = {
      appDataKey,
      load: () => this._loadFromDb(lsKey).then(migrateFn),
      save: (data: any, isForce: any) => this._saveToDb(lsKey, data, isForce),
    };

    this._baseModels.push(model);
    return model;
  }

  // TODO maybe find a way to exec effects here as well
  private _cmProject<S, M>(
    lsKey: string,
    appDataKey: keyof LegacyAppDataForProjects,
    reducerFn: (state: S, action: Action) => S,
    migrateFn: (state: S, projectId: string) => S = (v) => v,
  ): LegacyPersistenceForProjectModel<S, M> {
    const model = {
      appDataKey,
      load: (projectId: any): Promise<S> =>
        this._loadFromDb(this._makeProjectKey(projectId, lsKey)).then((v) =>
          migrateFn(v, projectId),
        ),
      save: (projectId: any, data: any, isForce: any) =>
        this._saveToDb(this._makeProjectKey(projectId, lsKey), data, isForce),
    };

    this._projectModels.push(model);
    return model;
  }

  private async _loadLegacyAppDataForProjects(
    projectIds: string[],
  ): Promise<LegacyAppDataForProjects> {
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
  private async _loadForProjectIds(pids: any, getDataFn: Function): Promise<any> {
    return await pids.reduce(async (acc: any, projectId: any) => {
      const prevAcc = await acc;
      const dataForProject = await getDataFn(projectId);
      return {
        ...prevAcc,
        [projectId]: dataForProject,
      };
    }, Promise.resolve({}));
  }

  private _makeProjectKey(projectId: string, subKey: string, additional?: string) {
    return (
      LS_PROJECT_PREFIX + projectId + '_' + subKey + (additional ? '_' + additional : '')
    );
  }

  // DATA STORAGE INTERFACE
  // ---------------------
  private async _saveToDb(
    key: string,
    data: any,
    isForce: boolean = false,
  ): Promise<any> {
    if (!this._isBlockSaving || isForce === true) {
      return this._databaseService.save(key, data);
    } else {
      console.warn('BLOCKED SAVING for ', key);
      return Promise.reject('Data import currently in progress. Saving disabled');
    }
  }

  private async _loadFromDb(key: string): Promise<any> {
    return this._databaseService.load(key);
  }
}

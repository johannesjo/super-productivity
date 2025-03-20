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
import { Subject } from 'rxjs';
import { AllowedDBKeys, DB } from '../core/persistence/storage-keys.const';
import { AppDataComplete } from '../imex/sync/sync.model';
import { isValidAppData } from '../imex/sync/is-valid-app-data.util';
import { devError } from '../util/dev-error';

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

const MAX_INVALID_DATA_ATTEMPTS = 10;

@Injectable({
  providedIn: 'root',
})
export class PfapiService {
  public readonly pf = new Pfapi(MODEL_CFGS, SYNC_PROVIDERS, {});
  public readonly m: ModelCfgToModelCtrl<MyModelCfgs> = this.pf.m;

  // TODO replace with pfapi event
  onAfterSave$: Subject<{
    appDataKey: AllowedDBKeys;
    data: unknown;
    isDataImport: boolean;
    isSyncModelChange: boolean;
    projectId?: string;
  }> = new Subject();

  private _invalidDataCount = 0;

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

  // TODO
  // BACKUP AND SYNC RELATED
  // -----------------------
  async loadBackup(): Promise<AppDataComplete> {
    return (await this.pf.db.load(DB.BACKUP)) as any;
  }

  async saveBackup(backup?: AppDataComplete): Promise<unknown> {
    return (await this.pf.db.save(DB.BACKUP, backup)) as any;
  }

  async clearBackup(): Promise<unknown> {
    return (await this.pf.db.remove(DB.BACKUP)) as any;
  }

  async loadComplete(isMigrate = false): Promise<AppDataComplete> {
    // TODO better
    const syncModels = await this.pf.getAllSyncModelData();
    console.log(syncModels);

    return {
      ...syncModels,
      // TODO better
      lastLocalSyncModelChange: null,
      lastArchiveUpdate: null,
    } as any;
  }

  async importComplete(data: AppDataComplete): Promise<unknown> {
    return await this.pf.importAllSycModelData(data as any);
  }

  async clearDatabaseExceptBackupAndLocalOnlyModel(): Promise<void> {
    const backup: AppDataComplete = await this.loadBackup();
    // TODO
    // const localOnlyModel = await this._persistenceLocalService.load();
    await this.pf.db.clearDatabase();
    // await this._persistenceLocalService.save(localOnlyModel);
    if (backup) {
      await this.saveBackup(backup);
    }
  }
}

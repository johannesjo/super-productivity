import {Injectable} from '@angular/core';
import {
  LS_BACKUP,
  LS_BOOKMARK_STATE,
  LS_GLOBAL_CFG,
  LS_IMPROVEMENT_STATE,
  LS_ISSUE_STATE,
  LS_LAST_ACTIVE,
  LS_METRIC_STATE,
  LS_NOTE_STATE,
  LS_OBSTRUCTION_STATE,
  LS_PROJECT_ARCHIVE,
  LS_PROJECT_META_LIST,
  LS_PROJECT_PREFIX,
  LS_REMINDER,
  LS_TASK_ARCHIVE,
  LS_TASK_ATTACHMENT_STATE,
  LS_TASK_STATE
} from './ls-keys.const';
import {GlobalConfig} from '../../features/config/config.model';
import {IssueProviderKey, IssueState, IssueStateMap} from '../../features/issue/issue';
import {ProjectState} from '../../features/project/store/project.reducer';
import {TaskState} from '../../features/tasks/store/task.reducer';
import {EntityState} from '@ngrx/entity';
import {Task, TaskWithSubTasks} from '../../features/tasks/task.model';
import {AppBaseData, AppDataComplete, AppDataForProjects} from '../../imex/sync/sync.model';
import {BookmarkState} from '../../features/bookmark/store/bookmark.reducer';
import {AttachmentState} from '../../features/attachment/store/attachment.reducer';
import {NoteState} from '../../features/note/store/note.reducer';
import {Reminder} from '../../features/reminder/reminder.model';
import {SnackService} from '../snack/snack.service';
import {DatabaseService} from './database.service';
import {loadFromLs, saveToLs} from './local-storage';
import {GITHUB_TYPE, issueProviderKeys, JIRA_TYPE} from '../../features/issue/issue.const';
import {DEFAULT_PROJECT_ID} from '../../features/project/project.const';
import {ArchivedProject, ProjectArchive} from '../../features/project/project.model';
import {JiraIssueState} from '../../features/issue/jira/jira-issue/store/jira-issue.reducer';
import {GithubIssueState} from '../../features/issue/github/github-issue/store/github-issue.reducer';
import {CompressionService} from '../compression/compression.service';
import {PersistenceBaseModel, PersistenceForProjectModel} from './persistence';
import {MetricState} from '../../features/metric/metric.model';
import {ImprovementState} from '../../features/metric/improvement/improvement.model';
import {ObstructionState} from '../../features/metric/obstruction/obstruction.model';


@Injectable({
  providedIn: 'root',
})
export class PersistenceService {
  private _isBlockSaving = false;

  // needs to be assigned before the creations
  private _baseModels = [];
  private _projectModels = [];

  // TODO auto generate ls keys from appDataKey where possible
  project = this._cmBase<ProjectState>(LS_PROJECT_META_LIST, 'project');
  globalConfig = this._cmBase<GlobalConfig>(LS_GLOBAL_CFG, 'globalConfig');
  reminders = this._cmBase<Reminder[]>(LS_REMINDER, 'reminders');
  improvement = this._cmBase<ImprovementState>(LS_IMPROVEMENT_STATE, 'improvement');
  obstruction = this._cmBase<ObstructionState>(LS_OBSTRUCTION_STATE, 'obstruction');

  task = this._cmProject<TaskState>(LS_TASK_STATE, 'task');
  taskArchive = this._cmProject<EntityState<TaskWithSubTasks>>(LS_TASK_ARCHIVE, 'taskArchive');
  taskAttachment = this._cmProject<AttachmentState>(LS_TASK_ATTACHMENT_STATE, 'taskAttachment');
  bookmark = this._cmProject<BookmarkState>(LS_BOOKMARK_STATE, 'bookmark');
  note = this._cmProject<NoteState>(LS_NOTE_STATE, 'note');
  metric = this._cmProject<MetricState>(LS_METRIC_STATE, 'metric');


  constructor(
    private _snackService: SnackService,
    private _databaseService: DatabaseService,
    private _compressionService: CompressionService,
  ) {
    // this.loadComplete().then(d => console.log(d));
    // this.loadCompleteForProject('DEFAULT').then(d => console.log(d));
  }

  // TASK ARCHIVE
  async saveToTaskArchiveForProject(projectId, tasksToArchive: EntityState<TaskWithSubTasks>, isForce = false) {
    const currentArchive: EntityState<Task> = await this.taskArchive.load(projectId);

    if (currentArchive) {
      const entities = {
        ...currentArchive.entities,
        ...tasksToArchive.entities
      };
      const mergedEntities = {
        ids: Object.keys(entities),
        entities,
      };
      return this.taskArchive.save(projectId, mergedEntities, isForce);
    } else {
      return this.taskArchive.save(projectId, tasksToArchive, isForce);
    }
  }

  async removeTasksFromArchive(projectId: string, taskIds: string[]) {
    const currentArchive: EntityState<Task> = await this.taskArchive.load(projectId);
    const allIds = currentArchive.ids as string[] || [];
    const idsToRemove = [];
    taskIds.forEach((taskId) => {
      if (allIds.indexOf(taskId) > -1) {
        delete currentArchive.entities[taskId];
        idsToRemove.push(taskId);
      }
    });

    return this.taskArchive.save(projectId, {
      ...currentArchive,
      ids: allIds.filter((id) => !idsToRemove.includes(id)),
    }, true);
  }

  // ISSUES
  async saveIssuesForProject(projectId, issueType: IssueProviderKey, data: IssueState, isForce = false): Promise<any> {
    return this._saveToDb(this._makeProjectKey(projectId, LS_ISSUE_STATE, issueType), data, isForce);
  }

  async loadIssuesForProject(projectId, issueType: IssueProviderKey): Promise<IssueState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_ISSUE_STATE, issueType));
  }

  async removeIssuesForProject(projectId, issueType: IssueProviderKey): Promise<IssueState> {
    return this._removeFromDb(this._makeProjectKey(projectId, LS_ISSUE_STATE, issueType));
  }


  // PROJECT ARCHIVING
  // -----------------
  async loadProjectArchive(): Promise<ProjectArchive> {
    return await this._loadFromDb(LS_PROJECT_ARCHIVE);
  }

  async saveProjectArchive(data: ProjectArchive, isForce = false): Promise<any> {
    return await this._saveToDb(LS_PROJECT_ARCHIVE, data, isForce);
  }

  async loadArchivedProject(projectId): Promise<ArchivedProject> {
    const archive = await this._loadFromDb(LS_PROJECT_ARCHIVE);
    const projectDataCompressed = archive[projectId];
    const decompressed = await this._compressionService.decompress(projectDataCompressed);
    const parsed = JSON.parse(decompressed);
    console.log(`Decompressed project, size before: ${projectDataCompressed.length}, size after: ${decompressed.length}`, parsed);
    return parsed;
  }

  async removeArchivedProject(projectId): Promise<any> {
    const archive = await this._loadFromDb(LS_PROJECT_ARCHIVE);
    delete archive[projectId];
    await this.saveProjectArchive(archive);
  }

  async saveArchivedProject(projectId, archivedProject: ArchivedProject) {
    const current = await this.loadProjectArchive() || {};
    const jsonStr = JSON.stringify(archivedProject);
    const compressedData = await this._compressionService.compress(jsonStr);
    console.log(`Compressed project, size before: ${jsonStr.length}, size after: ${compressedData.length}`, archivedProject);
    return this.saveProjectArchive({
      ...current,
      [projectId]: compressedData,
    });
  }

  // TODO can probably be combined with the one below
  async loadCompleteForProject(projectId: string): Promise<ArchivedProject> {
    const issueStateMap: IssueStateMap = {
      JIRA: await this.loadIssuesForProject(projectId, JIRA_TYPE) as JiraIssueState,
      GITHUB: await this.loadIssuesForProject(projectId, GITHUB_TYPE) as GithubIssueState,
    };

    const forProjectsData = await Promise.all(this._projectModels.map(async (modelCfg) => {
      return {
        [modelCfg.appDataKey]: await modelCfg.load(projectId),
      };
    }));
    const projectData = Object.assign({}, ...forProjectsData);

    return {
      ...projectData,
      issue: issueStateMap,
    };
  }

  async removeCompleteRelatedDataForProject(projectId: string): Promise<any> {
    await Promise.all(this._projectModels.map((modelCfg) => {
      return modelCfg.remove(projectId);
    }));
    await issueProviderKeys.forEach(async (key) => {
      await this.removeIssuesForProject(projectId, key);
    });
  }

  async restoreCompleteRelatedDataForProject(projectId: string, data: ArchivedProject): Promise<any> {
    await Promise.all(this._projectModels.map((modelCfg) => {
      return modelCfg.save(projectId, data[modelCfg.appDataKey]);
    }));
    await issueProviderKeys.forEach(async (key) => {
      await this.saveIssuesForProject(projectId, key, data.issue[key]);
    });
  }

  async archiveProject(projectId: string): Promise<any> {
    const projectData = await this.loadCompleteForProject(projectId);
    await this.saveArchivedProject(projectId, projectData);
    await this.removeCompleteRelatedDataForProject(projectId);
  }

  async unarchiveProject(projectId: string): Promise<any> {
    const projectData = await this.loadArchivedProject(projectId);
    await this.restoreCompleteRelatedDataForProject(projectId, projectData);
    await this.removeArchivedProject(projectId);
  }

  // BACKUP AND SYNC RELATED
  // -----------------------
  saveLastActive(date: string = new Date().toString()) {
    // TODO refactor to timestamp
    // console.log('Save LastAct', date);
    saveToLs(LS_LAST_ACTIVE, date);
  }

  getLastActive(): string {
    // TODO refactor to timestamp
    return loadFromLs(LS_LAST_ACTIVE);
  }

  async loadBackup(): Promise<AppDataComplete> {
    return this._loadFromDb(LS_BACKUP);
  }

  async saveBackup(backup?: AppDataComplete): Promise<any> {
    const backupData: AppDataComplete = backup || await this.loadComplete();
    return this._saveToDb(LS_BACKUP, backupData, true);
  }

  async loadAppBaseData(): Promise<AppBaseData> {
    const promises = this._baseModels.map(async (modelCfg) => {
      const modelState = await modelCfg.load();
      return {
        [modelCfg.appDataKey]: modelState,
      };
    });
    const baseDataArray: Partial<AppBaseData>[] = await Promise.all(promises);
    return Object.assign({}, ...baseDataArray);
  }

  async loadAppDataForProjects(projectIds: string[]): Promise<AppDataForProjects> {
    const forProjectsData = await Promise.all(this._projectModels.map(async (modelCfg) => {
      const modelState = await this._loadForProjectIds(projectIds, modelCfg.load);
      return {
        [modelCfg.appDataKey]: modelState,
      };
    }));
    return Object.assign({}, ...forProjectsData);
  }

  // NOTE: not including backup
  async loadComplete(): Promise<AppDataComplete> {
    const projectState = await this.project.load();
    const pids = projectState ? projectState.ids as string[] : [DEFAULT_PROJECT_ID];

    return {
      lastActiveTime: this.getLastActive(),

      ...(await this.loadAppDataForProjects(pids)),
      ...(await this.loadAppBaseData()),

      issue: await pids.reduce(async (acc, projectId) => {
        const prevAcc = await acc;
        const issueStateMap = {};
        await Promise.all(issueProviderKeys.map(async (key) => {
          issueStateMap[key] = await this.loadIssuesForProject(projectId, key);
        }));

        return {
          ...prevAcc,
          [projectId]: issueStateMap as IssueStateMap
        };
      }, Promise.resolve({})),
    };
  }

  async importComplete(data: AppDataComplete) {
    console.log('IMPORT--->', data);
    this._isBlockSaving = true;

    const issuePromises = [];
    Object.keys(data.issue).forEach(projectId => {
      const issueData = data.issue[projectId];
      Object.keys(issueData).forEach((issueProviderKey: IssueProviderKey) => {
        issuePromises.push(this.saveIssuesForProject(projectId, issueProviderKey, issueData[issueProviderKey], true));
      });
    });

    const forBase = Promise.all(this._baseModels.map(async (modelCfg) => {
      return await modelCfg.save(data[modelCfg.appDataKey], true);
    }));
    const forProject = Promise.all(this._projectModels.map(async (modelCfg) => {
      return await this._saveForProjectIds(data[modelCfg.appDataKey], modelCfg.save, true);
    }));

    return await Promise.all([
      ...issuePromises,
      forBase,
      forProject
    ])
      .then(() => {
        this._isBlockSaving = false;
      })
      .catch(() => {
        this._isBlockSaving = false;
      });
  }

  async cleanDatabase() {
    const completeData: AppDataComplete = await this.loadComplete();
    await this._databaseService.clearDatabase();
    await this.importComplete(completeData);
  }

  async clearDatabaseExceptBackup() {
    const backup: AppDataComplete = await this.loadBackup();
    await this._databaseService.clearDatabase();
    if (backup) {
      await this.saveBackup(backup);
    }
  }


  // ------------------
  private _cmBase<T>(lsKey: string, appDataKey: keyof AppBaseData): PersistenceBaseModel<T> {
    const model = {
      appDataKey,
      load: () => this._loadFromDb(lsKey),
      save: (data, isForce) => this._saveToDb(lsKey, data, isForce),
    };

    this._baseModels.push(model);
    return model;
  }

  private _cmProject<T>(lsKey: string, appDataKey: keyof AppDataForProjects): PersistenceForProjectModel<T> {
    const model = {
      appDataKey,
      load: (projectId) => this._loadFromDb(this._makeProjectKey(projectId, lsKey)),
      save: (projectId, data, isForce) => this._saveToDb(this._makeProjectKey(projectId, lsKey), data, isForce),
      remove: (projectId) => this._removeFromDb(this._makeProjectKey(projectId, lsKey)),
    };
    this._projectModels.push(model);
    return model;
  }

  private async _loadForProjectIds(pids, getDataFn: Function) {
    return await pids.reduce(async (acc, projectId) => {
      const prevAcc = await acc;
      const dataForProject = await getDataFn(projectId);
      return {
        ...prevAcc,
        [projectId]: dataForProject
      };
    }, Promise.resolve({}));
  }

  private async _saveForProjectIds(data: any, saveDataFn: Function, isForce = false) {
    const promises = [];
    Object.keys(data).forEach(projectId => {
      if (data[projectId]) {
        promises.push(saveDataFn(projectId, data[projectId], isForce));
      }
    });
    return await Promise.all(promises);
  }

  private _makeProjectKey(projectId, subKey, additional?) {
    return LS_PROJECT_PREFIX + projectId + '_' + subKey + (additional ? '_' + additional : '');
  }


  // DATA STORAGE INTERFACE
  // ---------------------
  private async _saveToDb(key: string, data: any, isForce = false): Promise<any> {
    if (!this._isBlockSaving || isForce === true) {
      return this._databaseService.save(key, data);
    } else {
      console.warn('BLOCKED SAVING for ', key);
      return Promise.reject('Data import currently in progress. Saving disabled');
    }
  }

  private async _removeFromDb(key: string, isForce = false): Promise<any> {
    if (!this._isBlockSaving || isForce === true) {
      return this._databaseService.remove(key);
    } else {
      console.warn('BLOCKED SAVING for ', key);
      return Promise.reject('Data import currently in progress. Removing disabled');
    }
  }

  private async _loadFromDb(key: string): Promise<any> {
    return this._databaseService.load(key);
  }
}

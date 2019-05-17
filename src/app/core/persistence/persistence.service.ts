import {Injectable} from '@angular/core';
import {
  LS_BACKUP,
  LS_BOOKMARK_STATE,
  LS_GLOBAL_CFG,
  LS_ISSUE_STATE,
  LS_LAST_ACTIVE,
  LS_NOTE_STATE,
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
import {
  AppBaseData,
  AppDataComplete,
  AppDataCompleteCfgBasicEntry,
  AppDataCompleteCfgForProjectEntry,
  AppDataForProjects
} from '../../imex/sync/sync.model';
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


@Injectable({
  providedIn: 'root',
})
export class PersistenceService {
  private _isBlockSaving = false;


  /*
  TODO in the future we might be able to do something like this
  and then generate all the functions we need
  export interface NewDef {
    [key: string]: {
      isForProject: boolean;
      stateModel: EntityState;
      lsKey: string;
    };
  }
   */

  private _baseModel: AppDataCompleteCfgBasicEntry[] = [
    {
      appDataKey: 'project',
      load: this.loadProjectsMeta.bind(this),
      save: this.saveProjectsMeta.bind(this),
    },
    {
      appDataKey: 'globalConfig',
      load: this.loadGlobalConfig.bind(this),
      save: this.saveGlobalConfig.bind(this),
    },
    {
      appDataKey: 'reminders',
      load: this.loadReminders.bind(this),
      save: this.saveReminders.bind(this),
    },
    {
      appDataKey: 'archivedProjects',
      load: this.loadProjectArchive.bind(this),
      save: this.saveProjectArchive.bind(this),
    },
  ];

  private _forProjectModel: AppDataCompleteCfgForProjectEntry[] = [
    {
      appDataKey: 'bookmark',
      load: this.loadBookmarksForProject.bind(this),
      save: this.saveBookmarksForProject.bind(this),
      remove: this.removeBookmarksForProject.bind(this),
    },
    {
      appDataKey: 'note',
      load: this.loadNotesForProject.bind(this),
      save: this.saveNotesForProject.bind(this),
      remove: this.removeNotesForProject.bind(this),
    },
    {
      appDataKey: 'task',
      load: this.loadTasksForProject.bind(this),
      save: this.saveTasksForProject.bind(this),
      remove: this.removeTasksForProject.bind(this),
    },
    {
      appDataKey: 'taskArchive',
      load: this.loadTaskArchiveForProject.bind(this),
      save: this.saveToTaskArchiveForProject.bind(this),
      remove: this.removeTaskArchiveForProject.bind(this),
    },
    {
      appDataKey: 'taskAttachment',
      load: this.loadTaskAttachmentsForProject.bind(this),
      save: this.saveTaskAttachmentsForProject.bind(this),
      remove: this.removeTaskAttachmentsForProject.bind(this),
    },
  ];

  constructor(
    private _snackService: SnackService,
    private _databaseService: DatabaseService,
    private _compressionService: CompressionService,
  ) {
    // this.loadComplete().then(d => console.log(d));
  }

  async loadProjectsMeta(): Promise<ProjectState> {
    return this._loadFromDb(LS_PROJECT_META_LIST);
  }

  async saveProjectsMeta(projectData: ProjectState, isForce = false): Promise<any> {
    return this._saveToDb(LS_PROJECT_META_LIST, projectData, isForce);
  }

  async loadReminders(): Promise<Reminder[]> {
    return this._loadFromDb(LS_REMINDER);
  }

  async saveReminders(reminders: Reminder[], isForce = false): Promise<any> {
    return this._saveToDb(LS_REMINDER, reminders, isForce);
  }

  // TASKS
  async saveTasksForProject(projectId, taskState: TaskState, isForce = false): Promise<any> {
    return this._saveToDb(this._makeProjectKey(projectId, LS_TASK_STATE), taskState, isForce);
  }

  async loadTasksForProject(projectId): Promise<TaskState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_TASK_STATE));
  }

  async removeTasksForProject(projectId): Promise<TaskState> {
    return this._removeFromDb(this._makeProjectKey(projectId, LS_TASK_STATE));
  }

  // TASK ARCHIVE
  async saveToTaskArchiveForProject(projectId, tasksToArchive: EntityState<TaskWithSubTasks>, isForce = false) {
    const lsKey = this._makeProjectKey(projectId, LS_TASK_ARCHIVE);
    const currentArchive: EntityState<Task> = await this._loadFromDb(lsKey);

    if (currentArchive) {
      const entities = {
        ...currentArchive.entities,
        ...tasksToArchive.entities
      };
      const mergedEntities = {
        ids: Object.keys(entities),
        entities,
      };
      return this._saveToDb(lsKey, mergedEntities, isForce);
    } else {
      return this._saveToDb(lsKey, tasksToArchive, isForce);
    }
  }

  async loadTaskArchiveForProject(projectId: string): Promise<EntityState<TaskWithSubTasks>> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_TASK_ARCHIVE));
  }

  async removeTaskArchiveForProject(projectId: string): Promise<EntityState<TaskWithSubTasks>> {
    return this._removeFromDb(this._makeProjectKey(projectId, LS_TASK_ARCHIVE));
  }

  async removeTasksFromArchive(projectId: string, taskIds: string[]) {
    const lsKey = this._makeProjectKey(projectId, LS_TASK_ARCHIVE);
    const currentArchive: EntityState<Task> = await this._loadFromDb(lsKey);
    const allIds = currentArchive.ids as string[] || [];
    const idsToRemove = [];
    taskIds.forEach((taskId) => {
      if (allIds.indexOf(taskId) > -1) {
        delete currentArchive.entities[taskId];
        idsToRemove.push(taskId);
      }
    });

    return this._saveToDb(lsKey, {
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

  // BOOKMARKS
  async saveBookmarksForProject(projectId, bookmarkState: BookmarkState, isForce = false) {
    return this._saveToDb(this._makeProjectKey(projectId, LS_BOOKMARK_STATE), bookmarkState, isForce);
  }

  async loadBookmarksForProject(projectId): Promise<BookmarkState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_BOOKMARK_STATE));
  }

  async removeBookmarksForProject(projectId): Promise<BookmarkState> {
    return this._removeFromDb(this._makeProjectKey(projectId, LS_BOOKMARK_STATE));
  }

  // ATTACHMENTS
  async saveTaskAttachmentsForProject(projectId, attachmentState: AttachmentState, isForce = false) {
    return this._saveToDb(this._makeProjectKey(projectId, LS_TASK_ATTACHMENT_STATE), attachmentState, isForce);
  }

  async loadTaskAttachmentsForProject(projectId): Promise<AttachmentState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_TASK_ATTACHMENT_STATE));
  }

  async removeTaskAttachmentsForProject(projectId): Promise<AttachmentState> {
    return this._removeFromDb(this._makeProjectKey(projectId, LS_TASK_ATTACHMENT_STATE));
  }

  // NOTES
  async saveNotesForProject(projectId, noteState: NoteState, isForce = false) {
    return this._saveToDb(this._makeProjectKey(projectId, LS_NOTE_STATE), noteState, isForce);
  }

  async loadNotesForProject(projectId): Promise<NoteState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_NOTE_STATE));
  }

  async removeNotesForProject(projectId): Promise<NoteState> {
    return this._removeFromDb(this._makeProjectKey(projectId, LS_NOTE_STATE));
  }

  // GLOBAL CONFIG
  // -------------
  async loadGlobalConfig(): Promise<GlobalConfig> {
    return this._loadFromDb(LS_GLOBAL_CFG);
  }

  async saveGlobalConfig(globalConfig: GlobalConfig, isForce = false) {
    return this._saveToDb(LS_GLOBAL_CFG, globalConfig, isForce);
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
    this.saveProjectArchive(archive);
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

  async loadCompleteForProject(projectId: string): Promise<ArchivedProject> {
    const issueStateMap: IssueStateMap = {
      JIRA: await this.loadIssuesForProject(projectId, JIRA_TYPE) as JiraIssueState,
      GITHUB: await this.loadIssuesForProject(projectId, GITHUB_TYPE) as GithubIssueState,
    };

    return {
      note: await this.loadNotesForProject(projectId),
      bookmark: await this.loadBookmarksForProject(projectId),
      task: await this.loadTasksForProject(projectId),
      taskArchive: await this.loadTaskArchiveForProject(projectId),
      taskAttachment: await this.loadTaskAttachmentsForProject(projectId),
      issue: issueStateMap,
    };
  }

  async removeCompleteRelatedDataForProject(projectId: string): Promise<any> {
    await Promise.all(this._forProjectModel.map((modelCfg) => {
      return modelCfg.remove(projectId);
    }));
    await issueProviderKeys.forEach(async (key) => {
      await this.removeIssuesForProject(projectId, key);
    });
  }

  async restoreCompleteRelatedDataForProject(projectId: string, data: ArchivedProject): Promise<any> {
    await Promise.all(this._forProjectModel.map((modelCfg) => {
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
    const promises = this._baseModel.map(async (modelCfg) => {
      const modelState = await modelCfg.load();
      return {
        [modelCfg.appDataKey]: modelState,
      };
    });
    const baseDataArray: Partial<AppBaseData>[] = await Promise.all(promises);
    console.log(baseDataArray);

    return Object.assign({}, ...baseDataArray);
  }

  async loadAppDataForProjects(projectIds: string[]): Promise<AppDataForProjects> {
    const forProjectsData = await Promise.all(this._forProjectModel.map(async (modelCfg) => {
      const modelState = await this._loadForProjectIds(projectIds, modelCfg.load);
      return {
        [modelCfg.appDataKey]: modelState,
      };
    }));
    return Object.assign({}, ...forProjectsData);
  }

  // NOTE: not including backup
  async loadComplete(): Promise<AppDataComplete> {
    const projectState = await this.loadProjectsMeta();
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

    const forBase = Promise.all(this._baseModel.map(async (modelCfg) => {
      return await modelCfg.save(data[modelCfg.appDataKey]);
    }));
    const forProject = Promise.all(this._forProjectModel.map(async (modelCfg) => {
      return await this._saveForProjectIds(data[modelCfg.appDataKey], modelCfg.save);
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

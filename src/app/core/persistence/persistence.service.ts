import { Injectable } from '@angular/core';
import {
  LS_BACKUP,
  LS_BOOKMARK_STATE,
  LS_GLOBAL_CFG,
  LS_ISSUE_STATE,
  LS_LAST_ACTIVE,
  LS_NOTE_STATE,
  LS_PROJECT_META_LIST,
  LS_PROJECT_PREFIX,
  LS_REMINDER,
  LS_TASK_ARCHIVE,
  LS_TASK_ATTACHMENT_STATE,
  LS_TASK_STATE
} from './ls-keys.const';
import { GlobalConfig } from '../../features/config/config.model';
import { IssueProviderKey, IssueState } from '../../features/issue/issue';
import { ProjectState } from '../../features/project/store/project.reducer';
import { TaskState } from '../../features/tasks/store/task.reducer';
import { EntityState } from '@ngrx/entity';
import { Task, TaskWithSubTasks } from '../../features/tasks/task.model';
import { AppDataComplete } from '../../imex/sync/sync.model';
import { BookmarkState } from '../../features/bookmark/store/bookmark.reducer';
import { AttachmentState } from '../../features/attachment/store/attachment.reducer';
import { NoteState } from '../../features/note/store/note.reducer';
import { Reminder } from '../../features/reminder/reminder.model';
import { SnackService } from '../snack/snack.service';
import { DatabaseService } from './database.service';
import { loadFromLs, saveToLs } from './local-storage';
import { issueProviderKeys } from '../../features/issue/issue.const';

@Injectable({
  providedIn: 'root'
})
export class PersistenceService {
  private _isBlockSaving = false;

  constructor(
    private _snackService: SnackService,
    private _databaseService: DatabaseService,
  ) {
  }

  // PROJECT RELATED
  // ---------------
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

  async saveTasksForProject(projectId, taskState: TaskState, isForce = false): Promise<any> {
    return this._saveToDb(this._makeProjectKey(projectId, LS_TASK_STATE), taskState, isForce);
  }

  async loadTasksForProject(projectId): Promise<TaskState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_TASK_STATE));
  }

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

  async loadTaskArchiveForProject(projectId: string): Promise<EntityState<Task>> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_TASK_ARCHIVE));
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

  async saveIssuesForProject(projectId, issueType: IssueProviderKey, data: IssueState, isForce = false): Promise<any> {
    return this._saveToDb(this._makeProjectKey(projectId, LS_ISSUE_STATE, issueType), data, isForce);
  }

  // TODO add correct type
  async loadIssuesForProject(projectId, issueType: IssueProviderKey): Promise<IssueState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_ISSUE_STATE, issueType));
  }

  async saveBookmarksForProject(projectId, bookmarkState: BookmarkState, isForce = false) {
    return this._saveToDb(this._makeProjectKey(projectId, LS_BOOKMARK_STATE), bookmarkState, isForce);
  }

  async loadBookmarksForProject(projectId): Promise<BookmarkState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_BOOKMARK_STATE));
  }

  async saveTaskAttachmentsForProject(projectId, attachmentState: AttachmentState, isForce = false) {
    return this._saveToDb(this._makeProjectKey(projectId, LS_TASK_ATTACHMENT_STATE), attachmentState, isForce);
  }

  async loadTaskAttachmentsForProject(projectId): Promise<AttachmentState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_TASK_ATTACHMENT_STATE));
  }

  async saveNotesForProject(projectId, noteState: NoteState, isForce = false) {
    return this._saveToDb(this._makeProjectKey(projectId, LS_NOTE_STATE), noteState, isForce);
  }

  async loadNotesForProject(projectId): Promise<NoteState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_NOTE_STATE));
  }

  // GLOBAL CONFIG
  // -------------
  async loadGlobalConfig(): Promise<GlobalConfig> {
    return this._loadFromDb(LS_GLOBAL_CFG);
  }

  async saveGlobalConfig(globalConfig: GlobalConfig, isForce = false) {
    return this._saveToDb(LS_GLOBAL_CFG, globalConfig, isForce);
  }

  // BACKUP AND SYNC RELATED
  // -----------------------
  saveLastActive(date: string = new Date().toString()) {
    // TODO refactor to timestamp
    console.log('SAVE LAST ACTIVE', date);

    saveToLs(LS_LAST_ACTIVE, date);
  }

  getLastActive(): string {
    // TODO refactor to timestamp
    return loadFromLs(LS_LAST_ACTIVE);
  }

  async loadBackup(): Promise<AppDataComplete> {
    return this._loadFromDb(LS_BACKUP);
  }

  async saveBackup(): Promise<any> {
    return this._saveToDb(LS_BACKUP, this.loadComplete(), true);
  }

  async loadComplete(): Promise<AppDataComplete> {
    const projectState = await this.loadProjectsMeta();
    const pids = projectState ? projectState.ids as string[] : [];

    return {
      lastActiveTime: this.getLastActive(),
      project: await this.loadProjectsMeta(),
      globalConfig: await this.loadGlobalConfig(),
      bookmark: await this._loadForProjectIds(pids, this.loadBookmarksForProject.bind(this)),
      note: await this._loadForProjectIds(pids, this.loadNotesForProject.bind(this)),
      task: await this._loadForProjectIds(pids, this.loadTasksForProject.bind(this)),
      taskArchive: await this._loadForProjectIds(pids, this.loadTaskArchiveForProject.bind(this)),
      taskAttachment: await this._loadForProjectIds(pids, this.loadTaskAttachmentsForProject.bind(this)),
      issue: await pids.reduce(async (acc, projectId) => {
        const prevAcc = await acc;
        const issueStateMap = {};
        await Promise.all(issueProviderKeys.map(async (key) => {
          issueStateMap[key] = await this.loadIssuesForProject(projectId, key);
        }));

        return {
          ...prevAcc,
          [projectId]: issueStateMap
        };
      }, Promise.resolve({})),
    };
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

    return await Promise.all([
      ...issuePromises,
      this.saveProjectsMeta(data.project, true),
      this.saveGlobalConfig(data.globalConfig, true),
      this._saveForProjectIds(data.bookmark, this.saveBookmarksForProject.bind(this), true),
      this._saveForProjectIds(data.note, this.saveNotesForProject.bind(this), true),
      this._saveForProjectIds(data.task, this.saveTasksForProject.bind(this), true),
      this._saveForProjectIds(data.taskArchive, this.saveToTaskArchiveForProject.bind(this), true),
      this._saveForProjectIds(data.taskAttachment, this.saveTaskAttachmentsForProject.bind(this), true),
    ])
      .then(() => {
        this._isBlockSaving = false;
      })
      .catch(() => {
        this._isBlockSaving = false;
      });
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
    // console.log('save', key, this._isBlockSaving);
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

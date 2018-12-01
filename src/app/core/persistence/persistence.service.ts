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
import { GlobalConfig } from '../config/config.model';
import { IssueProviderKey } from '../../issue/issue';
import { ProjectState } from '../../project/store/project.reducer';
import { TaskState } from '../../tasks/store/task.reducer';
import { JiraIssueState } from '../../issue/jira/jira-issue/store/jira-issue.reducer';
import { EntityState } from '@ngrx/entity';
import { Task } from '../../tasks/task.model';
import { AppDataComplete } from '../sync/sync.model';
import { BookmarkState } from '../../bookmark/store/bookmark.reducer';
import { AttachmentState } from '../../tasks/attachment/store/attachment.reducer';
import { NoteState } from '../../note/store/note.reducer';
import { Reminder } from '../../reminder/reminder.model';
import { SnackService } from '../snack/snack.service';
import { DatabaseService } from './database.service';
import { loadFromLs, saveToLs } from './local-storage';

@Injectable({
  providedIn: 'root'
})
export class PersistenceService {
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

  async saveProjectsMeta(projectData: ProjectState): Promise<any> {
    return this._saveToDbWithLastActive(LS_PROJECT_META_LIST, projectData);
  }

  async loadReminders(): Promise<Reminder[]> {
    return this._loadFromDb(LS_REMINDER);
  }

  async saveReminders(reminders: Reminder[]): Promise<any> {
    return this._saveToDbWithLastActive(LS_REMINDER, reminders);
  }

  async saveTasksForProject(projectId, taskState: TaskState): Promise<any> {
    return this._saveToDbWithLastActive(this._makeProjectKey(projectId, LS_TASK_STATE), taskState);
  }

  async loadTasksForProject(projectId): Promise<TaskState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_TASK_STATE));
  }

  async saveToTaskArchiveForProject(projectId, tasksToArchive: EntityState<Task>) {
    const lsKey = this._makeProjectKey(projectId, LS_TASK_ARCHIVE);
    const currentArchive: EntityState<Task> = await this._loadFromDb(lsKey);
    if (currentArchive) {
      const mergedEntities = {
        ids: [
          ...tasksToArchive.ids,
          ...currentArchive.ids
        ],
        entities: {
          ...currentArchive.entities,
          ...tasksToArchive.entities
        }
      };
      return this._saveToDbWithLastActive(lsKey, mergedEntities);
    } else {
      return this._saveToDbWithLastActive(lsKey, tasksToArchive);
    }
  }

  async loadTaskArchiveForProject(projectId: string): Promise<EntityState<Task>> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_TASK_ARCHIVE));
  }

  async saveIssuesForProject(projectId, issueType: IssueProviderKey, data: JiraIssueState): Promise<any> {
    return this._saveToDbWithLastActive(this._makeProjectKey(projectId, LS_ISSUE_STATE, issueType), data);
  }

  // TODO add correct type
  async loadIssuesForProject(projectId, issueType: IssueProviderKey): Promise<JiraIssueState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_ISSUE_STATE, issueType));
  }

  async saveBookmarksForProject(projectId, bookmarkState: BookmarkState) {
    return this._saveToDbWithLastActive(this._makeProjectKey(projectId, LS_BOOKMARK_STATE), bookmarkState);
  }

  async loadBookmarksForProject(projectId): Promise<BookmarkState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_BOOKMARK_STATE));
  }

  async saveTaskAttachmentsForProject(projectId, attachmentState: AttachmentState) {
    return this._saveToDbWithLastActive(this._makeProjectKey(projectId, LS_TASK_ATTACHMENT_STATE), attachmentState);
  }

  async loadTaskAttachmentsForProject(projectId): Promise<AttachmentState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_TASK_ATTACHMENT_STATE));
  }

  async saveNotesForProject(projectId, noteState: NoteState) {
    return this._saveToDbWithLastActive(this._makeProjectKey(projectId, LS_NOTE_STATE), noteState);
  }

  async loadNotesForProject(projectId): Promise<NoteState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_NOTE_STATE));
  }

  // GLOBAL CONFIG
  // -------------
  async loadGlobalConfig(): Promise<GlobalConfig> {
    return this._loadFromDb(LS_GLOBAL_CFG);
  }

  async saveGlobalConfig(globalConfig: GlobalConfig) {
    return this._saveToDbWithLastActive(LS_GLOBAL_CFG, globalConfig);
  }

  // BACKUP AND SYNC RELATED
  // -----------------------
  getLastActive(): string {
    // TODO refactor to timestamp
    return loadFromLs(LS_LAST_ACTIVE);
  }

  async loadBackup(): Promise<AppDataComplete> {
    return this._loadFromDb(LS_BACKUP);
  }

  async saveBackup(): Promise<any> {
    return this._saveToDbWithLastActive(LS_BACKUP, this.loadComplete());
  }

  async loadComplete(): Promise<AppDataComplete> {
    const crateProjectIdObj = async (getDataFn: Function) => {
      return projectIds.reduce(async (acc, projectId) => {
        return {
          ...acc,
          [projectId]: await getDataFn(projectId)
        };
      }, {});
    };

    const projectState = await this.loadProjectsMeta();
    const projectIds = projectState.ids as string[];
    return {
      lastActiveTime: this.getLastActive(),
      project: await this.loadProjectsMeta(),
      globalConfig: await this.loadGlobalConfig(),
      bookmark: await crateProjectIdObj(this.loadBookmarksForProject.bind(this)),
      note: await crateProjectIdObj(this.loadNotesForProject.bind(this)),
      task: await crateProjectIdObj(this.loadTasksForProject.bind(this)),
      taskArchive: await crateProjectIdObj(this.loadTaskArchiveForProject.bind(this)),
      issue: await projectIds.reduce(async (acc, projectId) => {
        return {
          ...acc,
          [projectId]: {
            'JIRA': await this.loadIssuesForProject(projectId, 'JIRA')
          }
        };
      }, {}),
    };
  }

  // TODO fix
  // TODO what is missing is a total cleanup of the existing projects and their data
  async importComplete(data: AppDataComplete) {
    console.log('IMPORT');
    console.log(data);
    this.saveProjectsMeta(data.project);
    this.saveGlobalConfig(data.globalConfig);
    this._saveDataForProjectIds(data.bookmark, this.saveBookmarksForProject.bind(this));
    this._saveDataForProjectIds(data.note, this.saveNotesForProject.bind(this));
    this._saveDataForProjectIds(data.task, this.saveTasksForProject.bind(this));
    this._saveDataForProjectIds(data.taskArchive, this.saveToTaskArchiveForProject.bind(this));
    Object.keys(data.issue).forEach(projectId => {
      const issueData = data.issue[projectId];
      Object.keys(issueData).forEach((issueProviderKey: IssueProviderKey) => {
        this.saveIssuesForProject(projectId, issueProviderKey, issueData[issueProviderKey]);
      });
    });
  }


  private _saveDataForProjectIds(data: any, saveDataFn: Function) {
    console.log(data, saveDataFn);
    console.log(data);


    Object.keys(data).forEach(projectId => {
      if (data[projectId]) {
        console.log(saveDataFn, projectId, data[projectId]);
        saveDataFn(projectId, data[projectId]);
      }
    });
  }


  private _makeProjectKey(projectId, subKey, additional?) {
    return LS_PROJECT_PREFIX + projectId + '_' + subKey + (additional ? '_' + additional : '');
  }


  // DATA STORAGE INTERFACE
  // ---------------------
  private async _saveToDbWithLastActive(key: string, data: any): Promise<any> {
    // TODO refactor to timestamp
    saveToLs(LS_LAST_ACTIVE, new Date().toString());
    return this._databaseService.saveWithLastActive(key, data);
  }

  private async _loadFromDb(key: string): Promise<any> {
    return this._databaseService.load(key);
  }
}

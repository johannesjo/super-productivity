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
    return this._saveToDbWithLastActive(LS_PROJECT_META_LIST, projectData, isForce);
  }

  async loadReminders(): Promise<Reminder[]> {
    return this._loadFromDb(LS_REMINDER);
  }

  async saveReminders(reminders: Reminder[], isForce = false): Promise<any> {
    return this._saveToDbWithLastActive(LS_REMINDER, reminders, isForce);
  }

  async saveTasksForProject(projectId, taskState: TaskState, isForce = false): Promise<any> {
    return this._saveToDbWithLastActive(this._makeProjectKey(projectId, LS_TASK_STATE), taskState, isForce);
  }

  async loadTasksForProject(projectId): Promise<TaskState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_TASK_STATE));
  }

  async saveToTaskArchiveForProject(projectId, tasksToArchive: EntityState<Task>, isForce = false) {
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
      return this._saveToDbWithLastActive(lsKey, mergedEntities, isForce);
    } else {
      return this._saveToDbWithLastActive(lsKey, tasksToArchive, isForce);
    }
  }

  async loadTaskArchiveForProject(projectId: string): Promise<EntityState<Task>> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_TASK_ARCHIVE));
  }

  async saveIssuesForProject(projectId, issueType: IssueProviderKey, data: JiraIssueState, isForce = false): Promise<any> {
    return this._saveToDbWithLastActive(this._makeProjectKey(projectId, LS_ISSUE_STATE, issueType), data, isForce);
  }

  // TODO add correct type
  async loadIssuesForProject(projectId, issueType: IssueProviderKey): Promise<JiraIssueState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_ISSUE_STATE, issueType));
  }

  async saveBookmarksForProject(projectId, bookmarkState: BookmarkState, isForce = false) {
    return this._saveToDbWithLastActive(this._makeProjectKey(projectId, LS_BOOKMARK_STATE), bookmarkState, isForce);
  }

  async loadBookmarksForProject(projectId): Promise<BookmarkState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_BOOKMARK_STATE));
  }

  async saveTaskAttachmentsForProject(projectId, attachmentState: AttachmentState, isForce = false) {
    return this._saveToDbWithLastActive(this._makeProjectKey(projectId, LS_TASK_ATTACHMENT_STATE), attachmentState, isForce);
  }

  async loadTaskAttachmentsForProject(projectId): Promise<AttachmentState> {
    return this._loadFromDb(this._makeProjectKey(projectId, LS_TASK_ATTACHMENT_STATE));
  }

  async saveNotesForProject(projectId, noteState: NoteState, isForce = false) {
    return this._saveToDbWithLastActive(this._makeProjectKey(projectId, LS_NOTE_STATE), noteState, isForce);
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
    return this._saveToDbWithLastActive(LS_GLOBAL_CFG, globalConfig, isForce);
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
    return this._saveToDbWithLastActive(LS_BACKUP, this.loadComplete(), true);
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
    this._isBlockSaving = true;

    await Object.keys(data.issue).forEach(async projectId => {
      const issueData = data.issue[projectId];
      Object.keys(issueData).forEach(async (issueProviderKey: IssueProviderKey) => {
        await this.saveIssuesForProject(projectId, issueProviderKey, issueData[issueProviderKey], true);
      });
    });

    return await Promise.all([
      this.saveProjectsMeta(data.project, true),
      this.saveGlobalConfig(data.globalConfig, true),
      this._saveForProjectIds(data.bookmark, this.saveBookmarksForProject.bind(this), true),
      this._saveForProjectIds(data.note, this.saveNotesForProject.bind(this), true),
      this._saveForProjectIds(data.task, this.saveTasksForProject.bind(this), true),
      this._saveForProjectIds(data.taskArchive, this.saveToTaskArchiveForProject.bind(this), true),
    ])
      .then(() => {
        this._isBlockSaving = false;
      })
      .catch(() => {
        this._isBlockSaving = false;
      });
  }


  private async _saveForProjectIds(data: any, saveDataFn: Function, isForce = false) {
    return await Object.keys(data).forEach(async projectId => {
      if (data[projectId]) {
        await saveDataFn(projectId, data[projectId], isForce);
      }
    });
  }

  private _makeProjectKey(projectId, subKey, additional?) {
    return LS_PROJECT_PREFIX + projectId + '_' + subKey + (additional ? '_' + additional : '');
  }


  // DATA STORAGE INTERFACE
  // ---------------------
  private async _saveToDbWithLastActive(key: string, data: any, isForce = false): Promise<any> {
    // console.log('save', key, this._isBlockSaving);
    if (!this._isBlockSaving || isForce === true) {
      // TODO refactor to timestamp
      saveToLs(LS_LAST_ACTIVE, new Date().toString());
      return this._databaseService.saveWithLastActive(key, data);
    } else {
      console.warn('BLOCKED SAVING for ', key);
      return Promise.reject('Data import currently in progress. Saving disabled');
    }
  }

  private async _loadFromDb(key: string): Promise<any> {
    return this._databaseService.load(key);
  }
}

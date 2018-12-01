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
import { loadFromLs, loadFromSessionStorage, saveToLs, saveToLsWithLastActive, saveToSessionStorage } from './local-storage';
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

@Injectable({
  providedIn: 'root'
})
export class PersistenceService {
  constructor(private _snackService: SnackService) {
    this._checkStorage();
    this._increaseStorage();
  }

  // PROJECT RELATED
  // ---------------
  loadProjectsMeta(): ProjectState {
    return loadFromLs(LS_PROJECT_META_LIST);
  }

  saveProjectsMeta(projectData: ProjectState) {
    saveToLsWithLastActive(LS_PROJECT_META_LIST, projectData);
  }

  loadReminders(): Reminder[] {
    return loadFromLs(LS_REMINDER);
  }

  saveReminders(reminders: Reminder[]) {
    saveToLsWithLastActive(LS_REMINDER, reminders);
  }

  saveTasksForProject(projectId, taskState: TaskState) {
    saveToLsWithLastActive(this._makeProjectKey(projectId, LS_TASK_STATE), taskState);
  }

  loadTasksForProject(projectId): TaskState {
    return loadFromLs(this._makeProjectKey(projectId, LS_TASK_STATE));
  }

  saveToTaskArchiveForProject(projectId, tasksToArchive: EntityState<Task>) {
    const lsKey = this._makeProjectKey(projectId, LS_TASK_ARCHIVE);
    const currentArchive: EntityState<Task> = loadFromLs(lsKey);
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
      this._saveToLsWithLastActive(lsKey, mergedEntities);
    } else {
      this._saveToLsWithLastActive(lsKey, tasksToArchive);
    }
  }

  loadTaskArchiveForProject(projectId: string): EntityState<Task> {
    return this._loadFromLs(this._makeProjectKey(projectId, LS_TASK_ARCHIVE));
  }

  saveIssuesForProject(projectId, issueType: IssueProviderKey, data: JiraIssueState) {
    this._saveToLsWithLastActive(this._makeProjectKey(projectId, LS_ISSUE_STATE, issueType), data);
  }

  // TODO add correct type
  loadIssuesForProject(projectId, issueType: IssueProviderKey): JiraIssueState {
    return this._loadFromLs(this._makeProjectKey(projectId, LS_ISSUE_STATE, issueType));
  }

  saveBookmarksForProject(projectId, bookmarkState: BookmarkState) {
    this._saveToLsWithLastActive(this._makeProjectKey(projectId, LS_BOOKMARK_STATE), bookmarkState);
  }

  loadBookmarksForProject(projectId): BookmarkState {
    return this._loadFromLs(this._makeProjectKey(projectId, LS_BOOKMARK_STATE));
  }

  saveTaskAttachmentsForProject(projectId, attachmentState: AttachmentState) {
    this._saveToLsWithLastActive(this._makeProjectKey(projectId, LS_TASK_ATTACHMENT_STATE), attachmentState);
  }

  loadTaskAttachmentsForProject(projectId): AttachmentState {
    return this._loadFromLs(this._makeProjectKey(projectId, LS_TASK_ATTACHMENT_STATE));
  }

  saveNotesForProject(projectId, noteState: NoteState) {
    this._saveToLsWithLastActive(this._makeProjectKey(projectId, LS_NOTE_STATE), noteState);
  }

  loadNotesForProject(projectId): NoteState {
    return this._loadFromLs(this._makeProjectKey(projectId, LS_NOTE_STATE));
  }

  // GLOBAL CONFIG
  // -------------
  loadGlobalConfig(): GlobalConfig {
    return this._loadFromLs(LS_GLOBAL_CFG);
  }

  saveGlobalConfig(globalConfig: GlobalConfig) {
    this._saveToLsWithLastActive(LS_GLOBAL_CFG, globalConfig);
  }

  // BACKUP AND SYNC RELATED
  // -----------------------
  getLastActive(): string {
    return this._loadFromLs(LS_LAST_ACTIVE);
  }

  loadBackup(): AppDataComplete {
    return this._loadFromSessionStorage(LS_BACKUP);
  }

  saveBackup() {
    this._saveToSessionStorage(LS_BACKUP, this.loadComplete());
  }

  loadComplete(): AppDataComplete {
    const crateProjectIdObj = (getDataFn: Function) => {
      return projectIds.reduce((acc, projectId) => {
        return {
          ...acc,
          [projectId]: getDataFn(projectId)
        };
      }, {});
    };

    const projectState = this.loadProjectsMeta();
    const projectIds = projectState.ids as string[];
    return {
      lastActiveTime: this.getLastActive(),
      project: this.loadProjectsMeta(),
      globalConfig: this.loadGlobalConfig(),
      bookmark: crateProjectIdObj(this.loadBookmarksForProject.bind(this)),
      note: crateProjectIdObj(this.loadNotesForProject.bind(this)),
      task: crateProjectIdObj(this.loadTasksForProject.bind(this)),
      taskArchive: crateProjectIdObj(this.loadTaskArchiveForProject.bind(this)),
      issue: projectIds.reduce((acc, projectId) => {
        return {
          ...acc,
          [projectId]: {
            'JIRA': this.loadIssuesForProject(projectId, 'JIRA')
          }
        };
      }, {}),
    };
  }

  // TODO what is missing is a total cleanup of the existing projects and their data
  importComplete(data: AppDataComplete) {
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

  private _checkStorage() {
    const storage = navigator['webkitPersistentStorage'];
    if (storage) {
      storage.queryUsageAndQuota(
        function (usedBytes, grantedBytes) {
          console.log('webkitPersistentStorage: we are using ', usedBytes, ' of ', grantedBytes, 'bytes');
        },
        function (e) {
          console.log('webkitPersistentStorage: Error', e);
        }
      );
    }

    if (navigator.storage) {
      navigator.storage.estimate().then(
        (value: StorageEstimate) => console.log(
          `storage: using`, value
        )
      );
    }
  }

  private _increaseStorage() {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(granted => {
        console.log('storage ', granted);
        // if (granted) {
        //
        // }
      });
    }

    const storage = navigator['webkitPersistentStorage'];
    if (storage) {
      // Request Quota (only for File System API)
      const requestedBytes = 1024 * 1024 * 200; // 200MB
      storage.requestQuota(
        requestedBytes, function (grantedBytes) {
          console.log('grantedBytes', grantedBytes);
        }, function (e) {
          console.log('Error', e);
        }
      );
    }
  }

  // DATA STORAGE INTERFACE
  // ---------------------
  private _saveToLs(key: string, data: any) {
    try {
      saveToLs(key, data);
    } catch (e) {
      console.error(e);
      this._snackService.open({type: 'ERROR', message: 'Error while saving to local storage'});
    }
  }

  private _saveToLsWithLastActive(key: string, data: any) {
    try {
      saveToLsWithLastActive(key, data);
    } catch (e) {
      console.error(e);
      this._snackService.open({type: 'ERROR', message: 'Error while saving to local storage'});
    }
  }

  private _loadFromLs(key: string) {
    try {
      return loadFromLs(key);
    } catch (e) {
      console.error(e);
      this._snackService.open({type: 'ERROR', message: 'Error while loading from local storage'});
    }
  }

  private _saveToSessionStorage(key: string, data: any) {
    try {
      saveToSessionStorage(key, data);
    } catch (e) {
      console.error(e);
      this._snackService.open({type: 'ERROR', message: 'Error while saving to session storage'});
    }
  }

  private _loadFromSessionStorage(key: string) {
    try {
      return loadFromSessionStorage(key);
    } catch (e) {
      console.error(e);
      this._snackService.open({type: 'ERROR', message: 'Error while loading from session storage'});
    }
  }
}

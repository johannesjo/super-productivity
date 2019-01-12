import { Injectable } from '@angular/core';
import { AppDataComplete } from './sync.model';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { SnackService } from '../../core/snack/snack.service';
import { ProjectService } from '../../features/project/project.service';
import { ConfigService } from '../../features/config/config.service';
import { TaskService } from '../../features/tasks/task.service';
import { BookmarkService } from '../../features/bookmark/bookmark.service';
import { NoteService } from '../../features/note/note.service';
import { JiraIssueService } from '../../features/issue/jira/jira-issue/jira-issue.service';
import { AttachmentService } from '../../features/attachment/attachment.service';

// TODO some of this can be done in a background script

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  constructor(
    private _persistenceService: PersistenceService,
    private _snackService: SnackService,
    private _projectService: ProjectService,
    private _configService: ConfigService,
    private _taskService: TaskService,
    private _attachmentService: AttachmentService,
    private _bookmarkService: BookmarkService,
    private _jiraIssueService: JiraIssueService,
    private _noteService: NoteService,
  ) {
  }

  saveLastActive(date: string) {
    this._persistenceService.saveLastActive(date);
  }

  getLastActive(): Date {
    return new Date(this._persistenceService.getLastActive());
  }

  async getCompleteSyncData(): Promise<AppDataComplete> {
    return await this._persistenceService.loadComplete();
  }

  async loadCompleteSyncData(data: AppDataComplete) {
    await this._saveBackup();
    this._snackService.open({message: 'Importing data', icon: 'cloud_download'});

    if (this._checkData(data)) {
      const curId = data.project.currentId;

      try {
        await this._persistenceService.importComplete(data);

        // save data to local storage
        await Promise.all([
          // reload view model from ls
          this._configService.load(true),
          this._projectService.load(),
          this._taskService.loadStateForProject(curId),
          this._bookmarkService.loadStateForProject(curId),
          this._noteService.loadStateForProject(curId),
          this._jiraIssueService.loadStateForProject(curId),
          this._attachmentService.loadStateForProject(curId),
        ]);
        this._snackService.open({type: 'SUCCESS', message: 'Data imported'});

      } catch (e) {
        this._snackService.open({type: 'ERROR', message: 'Something went wrong while importing the data. Falling back to local backup'});
        console.error(e);
        return await this._loadBackup();
      }
    } else {
      this._snackService.open({type: 'ERROR', message: 'Error while syncing. Invalid data'});
      console.error(data);
    }
  }

  private _checkData(data: AppDataComplete) {
    return typeof data === 'object'
      && typeof data.task === 'object'
      && typeof data.taskArchive === 'object'
      && typeof data.note === 'object'
      && typeof data.bookmark === 'object'
      // && typeof data.taskAttachment === 'object'
      && typeof data.project === 'object'
      && typeof data.globalConfig === 'object'
      && typeof data.issue === 'object'
      && typeof data.project.currentId === 'string'
      ;
  }

  private async _saveBackup(): Promise<any> {
    return await this._persistenceService.saveBackup();
  }

  private async _loadBackup(): Promise<any> {
    const data = await this._persistenceService.loadBackup();
    return this.loadCompleteSyncData(data);
  }
}

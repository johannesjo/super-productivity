import { Injectable } from '@angular/core';
import { AppDataComplete } from './sync.model';
import { PersistenceService } from '../persistence/persistence.service';
import { SnackService } from '../snack/snack.service';
import { ProjectService } from '../../project/project.service';
import { ConfigService } from '../config/config.service';
import { TaskService } from '../../tasks/task.service';

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
  ) {
  }

  getLastActive(): Date {
    return new Date(this._persistenceService.getLastActive());
  }

  getCompleteSyncData(): AppDataComplete {
    return this._persistenceService.loadComplete();
  }

  loadCompleteSyncData(data: AppDataComplete) {
    this._saveBackup();

    if (this._checkData(data)) {
      try {
        // save data to local storage
        this._persistenceService.saveComplete(data);

        // reload view model from ls
        this._configService.load();
        this._projectService.load();
        this._taskService.loadStateForProject(data.project.currentId);
      } catch (e) {
        this._snackService.open({type: 'ERROR', message: 'Something went wrong while importing the data. Falling back to local backup'});
        console.error(e);
        this._loadBackup();
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
      && typeof data.project === 'object'
      && typeof data.globalConfig === 'object'
      && typeof data.issue === 'object'
      && typeof data.project.currentId === 'string'
      ;
  }

  private _saveBackup() {
    this._persistenceService.saveBackup();
  }

  private _loadBackup() {
    const data = this._persistenceService.loadBackup();
    this.loadCompleteSyncData(data);
  }
}

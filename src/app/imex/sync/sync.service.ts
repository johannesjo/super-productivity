import {Injectable} from '@angular/core';
import {AppDataComplete} from './sync.model';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {SnackService} from '../../core/snack/snack.service';
import {ProjectService} from '../../features/project/project.service';
import {GlobalConfigService} from '../../features/config/global-config.service';
import {ReminderService} from '../../features/reminder/reminder.service';
import {ImexMetaService} from '../imex-meta/imex-meta.service';

// TODO some of this can be done in a background script

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  constructor(
    private _persistenceService: PersistenceService,
    private _snackService: SnackService,
    private _projectService: ProjectService,
    private _configService: GlobalConfigService,
    private _reminderService: ReminderService,
    private _imexMetaService: ImexMetaService,
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

  async loadCompleteSyncData(data: AppDataComplete, isBackupReload = false) {
    this._snackService.open({msg: 'Importing data', ico: 'cloud_download'});
    this._imexMetaService.setInProgress(true);

    // get rid of outdated project data
    if (!isBackupReload) {
      await this._persistenceService.saveBackup();
      await this._persistenceService.clearDatabaseExceptBackup();
    }

    if (this._checkData(data)) {
      const curId = data.project.currentId;

      try {
        // save data to database first then load to store from there
        await this._persistenceService.importComplete(data);
        await this._loadAllFromDatabaseToStore(curId);
        this._imexMetaService.setInProgress(false);
        this._snackService.open({type: 'SUCCESS', msg: 'Data imported'});

      } catch (e) {
        this._snackService.open({
          type: 'ERROR',
          msg: 'Something went wrong while importing the data. Falling back to local backup.'
        });
        console.error(e);
        await this._loadBackup();
        this._imexMetaService.setInProgress(false);
      }
    } else {
      this._snackService.open({type: 'ERROR', msg: 'Error while syncing. Invalid data'});
      console.error(data);
      this._imexMetaService.setInProgress(false);
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

  private async _loadAllFromDatabaseToStore(curId: string): Promise<any> {
    return await Promise.all([
      // reload view model from ls
      this._configService.load(true),
      // NOTE: loading the project state should deal with reloading the for project states via effect
      this._projectService.load(),
      this._reminderService.reloadFromLs(),
    ]);
  }

  private async _loadBackup(): Promise<any> {
    const data = await this._persistenceService.loadBackup();
    return this.loadCompleteSyncData(data, true);
  }
}

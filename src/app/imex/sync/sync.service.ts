import {Injectable} from '@angular/core';
import {AppDataComplete} from './sync.model';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {SnackService} from '../../core/snack/snack.service';
import {ProjectService} from '../../features/project/project.service';
import {GlobalConfigService} from '../../features/config/global-config.service';
import {ReminderService} from '../../features/reminder/reminder.service';
import {ImexMetaService} from '../imex-meta/imex-meta.service';
import {T} from '../../t.const';
import {TaskService} from '../../features/tasks/task.service';
import {MigrationService} from '../../core/migration/migration.service';
import {DataInitService} from '../../core/data-init/data-init.service';

// TODO some of this can be done in a background script

@Injectable({
  providedIn: 'root',
})
export class SyncService {

  constructor(
    private _persistenceService: PersistenceService,
    private _snackService: SnackService,
    private _projectService: ProjectService,
    private _taskService: TaskService,
    private _configService: GlobalConfigService,
    private _reminderService: ReminderService,
    private _imexMetaService: ImexMetaService,
    private _migrationService: MigrationService,
    private _dataInitService: DataInitService,
  ) {
  }

  saveLastActive(date: number | string | Date) {
    const d = (typeof date === 'number')
      ? date
      : new Date(date).getTime();
    this._persistenceService.saveLastActive(d);
  }

  getLastActive(): number {
    return this._persistenceService.getLastActive();
  }

  async getCompleteSyncData(): Promise<AppDataComplete> {
    return await this._persistenceService.loadComplete();
  }

  async loadCompleteSyncData(data: AppDataComplete, isBackupReload = false) {
    this._snackService.open({msg: T.S.SYNC.IMPORTING, ico: 'cloud_download'});
    this._imexMetaService.setInProgress(true);

    // get rid of outdated project data
    if (!isBackupReload) {
      await this._persistenceService.saveBackup();
      await this._persistenceService.clearDatabaseExceptBackup();
    }

    if (this._checkData(data)) {
      try {
        const migratedData = this._migrationService.migrateIfNecessary(data);
        // save data to database first then load to store from there
        await this._persistenceService.importComplete(migratedData);
        await this._loadAllFromDatabaseToStore();
        this._imexMetaService.setInProgress(false);
        this._snackService.open({type: 'SUCCESS', msg: T.S.SYNC.SUCCESS});

      } catch (e) {
        this._snackService.open({
          type: 'ERROR',
          msg: T.S.SYNC.ERROR_FALLBACK_TO_BACKUP,
        });
        console.error(e);
        await this._loadBackup();
        this._imexMetaService.setInProgress(false);
      }
    } else {
      this._snackService.open({type: 'ERROR', msg: T.S.SYNC.ERROR_INVALID_DATA});
      console.error(data);
      this._imexMetaService.setInProgress(false);
    }
  }

  private _checkData(data: AppDataComplete) {
    return typeof data === 'object'
      && typeof data.note === 'object'
      && typeof data.bookmark === 'object'
      && typeof data.task === 'object'

      // NOTE this is not there yet for projects with old data
      // && typeof data.tag === 'object'

      // NOTE these might not yet have been created yet...
      // && typeof data.globalConfig === 'object'
      // && typeof data.taskArchive === 'object'
      // && typeof data.taskAttachment === 'object'
      // && typeof data.project === 'object'
      ;
  }

  private async _loadAllFromDatabaseToStore(): Promise<any> {
    return await Promise.all([
      // reload view model from ls
      this._dataInitService.reInit$(null, true).toPromise(),
      this._reminderService.reloadFromLs(),
    ]);
  }

  private async _loadBackup(): Promise<any> {
    const data = await this._persistenceService.loadBackup();
    return this.loadCompleteSyncData(data, true);
  }
}

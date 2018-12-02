import { Injectable } from '@angular/core';
import { SyncService } from '../sync/sync.service';
import { ConfigService } from '../config/config.service';
import { GoogleDriveSyncConfig } from '../config/config.model';
import { GoogleApiService } from './google-api.service';
import * as moment from 'moment';
import { SnackService } from '../snack/snack.service';
import { DEFAULT_SYNC_FILE_NAME } from './google.const';
import { MatDialog } from '@angular/material';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { DialogConfirmDriveSyncLoadComponent } from './dialog-confirm-drive-sync-load/dialog-confirm-drive-sync-load.component';
import { DialogConfirmDriveSyncSaveComponent } from './dialog-confirm-drive-sync-save/dialog-confirm-drive-sync-save.component';
import { AppDataComplete } from '../sync/sync.model';

const MAX_REQUEST_DURATION = 15000;

@Injectable({
  providedIn: 'root'
})
export class GoogleDriveSyncService {
  autoSyncInterval: number;

  private _isSyncingInProgress = false;
  private _inProgressTimeout: number;

  constructor(
    private _syncService: SyncService,
    private _configService: ConfigService,
    private _googleApiService: GoogleApiService,
    private _snackService: SnackService,
    private _matDialog: MatDialog,
  ) {
  }

  get config(): GoogleDriveSyncConfig {
    return this._configService.cfg && this._configService.cfg.googleDriveSync;
  }

  init() {
    if (this.config.isEnabled && this.config.isAutoLogin) {
      this._googleApiService.login().then(() => {
        if (this.config.isAutoSyncToRemote) {
          this.resetAutoSyncToRemoteInterval();
        }

        if (this.config.isLoadRemoteDataOnStartup) {
          this._checkForInitialUpdate();
        }
      });
    }
  }

  updateConfig(data: Partial<GoogleDriveSyncConfig>) {
    this._configService.updateSection('googleDriveSync', data);
  }


  resetAutoSyncToRemoteInterval() {
    // always unset if set
    this.cancelAutoSyncToRemoteIntervalIfSet();
    if (!this.config.isAutoSyncToRemote || !this.config.isEnabled) {
      return;
    }
    const interval = this.config.syncInterval;

    if (interval < 5000) {
      console.log('GoogleDriveSync', 'Interval too low');
      return;
    }

    this.autoSyncInterval = window.setInterval(() => {
      // only sync if not in the middle of something
      this.saveForSyncIfEnabled();
    }, interval);
  }

  cancelAutoSyncToRemoteIntervalIfSet() {
    if (this.autoSyncInterval) {
      window.clearInterval(this.autoSyncInterval);
    }
  }

  async changeSyncFileName(newSyncFileName): Promise<any> {
    const res = await this._googleApiService.findFile(newSyncFileName);
    const filesFound = res.body.items;
    if (!filesFound || filesFound.length === 0) {
      const isSave = await this._confirmSaveNewFile(newSyncFileName);
      if (isSave) {
        this.updateConfig({
          syncFileName: newSyncFileName,
          // we need to unset to save to a new file
          _backupDocId: null,
        });
        await this._save();
      }
    } else if (filesFound.length > 1) {
      this._snackService.open({
        type: 'ERROR',
        message: `Multiple files with the name "${newSyncFileName}" found. Please delete all but one or choose a different name.`
      });
      throw new Error('Multiple files with the name same name found');
    } else if (filesFound.length === 1) {
      const isConfirmUseExisting = await this._confirmUsingExistingFileDialog(newSyncFileName);
      if (isConfirmUseExisting) {
        const fileToUpdate = filesFound[0];
        this.updateConfig({
          syncFileName: newSyncFileName,
          _backupDocId: fileToUpdate.id,
        });
        return fileToUpdate.id;
      }
    }
  }

  saveForSyncIfEnabled(isForce = false): Promise<any> {
    if (!this.config.isAutoSyncToRemote || !this.config.isEnabled) {
      return Promise.resolve();
    }

    if (this._isSyncingInProgress && !isForce) {
      console.log('GoogleDriveSync', 'SYNC OMITTED because of promise');
      return Promise.resolve();
    } else {
      console.log('GoogleDriveSync', 'SYNC');
      const promise = this.saveTo(isForce);
      if (this.config.isNotifyOnSync) {
        this._showAsyncToast(promise, 'Syncing to google drive');
      }
      return promise;
    }
  }

  async saveTo(isForce = false): Promise<any> {
    // don't execute sync interactions at the same time
    if (this._isSyncingInProgress && !isForce) {
      console.log('GoogleDriveSync', 'saveTo omitted because is in progress');
      return Promise.reject('Something in progress');
    }

    const promise = new Promise((resolve, reject) => {
      // CREATE OR FIND
      // ---------------------------
      // when we have no backup file we create one directly
      if (!this.config._backupDocId) {
        this.changeSyncFileName(this.config.syncFileName || DEFAULT_SYNC_FILE_NAME)
          .then(() => {
            this._save().then(resolve);
          }, reject);

        // JUST UPDATE
        // ---------------------------
        // otherwise update
      } else {
        this._googleApiService.getFileInfo(this.config._backupDocId)
          .then((res) => {
            const lastModifiedRemote = res.body.modifiedDate;
            if (this._isNewerThan(lastModifiedRemote, this.config._lastSyncToRemote)) {
              // remote has an update so prompt what to do
              this._confirmSaveDialog(lastModifiedRemote)
                .then(() => {
                  this._save().then(resolve);
                }, reject);
            } else {
              // all clear just save
              this._save().then(resolve);
            }
          })
          .catch(reject);
      }
    });
    this._handleInProgress(promise);
    return promise;
  }

  loadFrom(isSkipPromiseCheck = false, isForce = false): Promise<any> {
    const promise = new Promise((resolve, reject) => {
      const loadHandler = () => {
        this._loadFile().then((loadRes) => {
          const backup: AppDataComplete = loadRes.backup;
          const lastActiveLocal = this._syncService.getLastActive();
          const lastActiveRemote = backup.lastActiveTime;
          const lastUpdateFromRemote = this.config._lastSyncFromRemote;

          // no update required
          if (!isForce && this._isNewerThan(lastUpdateFromRemote, lastActiveRemote)) {
            this._snackService.open({
              type: 'SUCCESS',
              message: `Data already up to date`
            });
            reject();
          } else {
            // update but ask if remote data is not newer than the last local update
            const isSkipConfirm = isForce || (lastActiveRemote && this._isNewerThan(lastActiveRemote, lastActiveLocal));
            console.log('GoogleDriveSync', 'date comparision skipConfirm', isSkipConfirm, lastActiveLocal, lastActiveRemote);

            if (isSkipConfirm) {
              this._import(loadRes);
              resolve(loadRes);
            } else {
              this._confirmLoadDialog(lastActiveRemote)
                .then(() => {
                  this._import(loadRes);
                  resolve(loadRes);
                }, reject);
            }
          }
        }, reject);
      };

      // don't execute sync interactions at the same time
      if (!isSkipPromiseCheck && this._isSyncingInProgress) {
        // TODO a better solution is needed
        return Promise.reject('Something in progress');
      }

      // when we have no backup file we create one directly
      if (!this.config._backupDocId) {
        this.changeSyncFileName(this.config.syncFileName)
          .then(() => {
            loadHandler();
          }, reject);
      } else {
        loadHandler();
      }
    });

    // only assign this after promise check
    this._handleInProgress(promise);

    return promise;
  }

  private _import(loadRes) {
    const backupData: AppDataComplete = loadRes.backup;
    // const metaData = loadRes.meta;
    // TODO check if needed
    // // we also need to update the backup to persist it also after the import
    // backupData.googleDriveSync.lastLocalUpdate = metaData.modifiedDate;
    // // and we also need to update last sync to remote, as it kind of happened now
    // backupData.googleDriveSync.lastSyncToRemote = metaData.modifiedDate;
    // // also needs to be set to prevent double upgrades
    // backupData.lastActiveTime = new Date();
    this._syncService.loadCompleteSyncData(backupData)
      .then(() => {
        this.updateConfig({
          _lastLocalUpdate: new Date().toString(),
          _lastSyncFromRemote: new Date().toString(),
        });
      });
  }


  private _checkForInitialUpdate(): Promise<any> {
    const promise = this._googleApiService.getFileInfo(this.config._backupDocId)
      .then((res) => {
        const lastModifiedRemote = res.body.modifiedDate;
        console.log('GoogleDriveSync',
          this._formatDate(lastModifiedRemote),
          ' > ',
          this._formatDate(this.config._lastLocalUpdate),
          this._isNewerThan(lastModifiedRemote, this.config._lastLocalUpdate)
        );

        if (this._isNewerThan(lastModifiedRemote, this.config._lastLocalUpdate)) {
          this._snackService.open({
            message: `There is a remote update! Downloading...`,
            icon: 'file_upload',
          });

          console.log('GoogleDriveSync', 'HAS CHANGED (modified Date comparision), TRYING TO UPDATE');
          this.loadFrom(true);
        }
      });

    this._handleInProgress(promise);
    return promise;
  }

  private _showAsyncToast(promise, msg) {
    this._snackService.open({
      type: 'CUSTOM',
      icon: 'file_upload',
      message: msg,
      config: {duration: 60000},
      promise,
    });
  }

  private _confirmSaveDialog(remoteModified): Promise<any> {
    const lastActiveLocal = this._syncService.getLastActive();
    return new Promise((resolve, reject) => {
      this._matDialog.open(DialogConfirmDriveSyncSaveComponent, {
        restoreFocus: true,
        data: {
          loadFromRemote: () => {
            this.loadFrom(true, true);
            reject.bind(this)();
          },
          saveToRemote: resolve.bind(this),
          cancel: reject.bind(this),
          lastSyncToRemote: this._formatDate(this.config._lastSyncToRemote),
          lastSyncFromRemote: this._formatDate(this.config._lastSyncFromRemote),
          remoteModified: this._formatDate(remoteModified),
          lastActiveLocal: this._formatDate(lastActiveLocal),
        }
      });
    });
  }

  private _confirmLoadDialog(remoteModified): Promise<any> {
    const lastActiveLocal = this._syncService.getLastActive();
    return new Promise((resolve, reject) => {
      this._matDialog.open(DialogConfirmDriveSyncLoadComponent, {
        restoreFocus: true,
        data: {
          loadFromRemote: resolve.bind(this),
          saveToRemote: () => {
            this._save();
            reject.bind(this)();
          },
          cancel: reject,
          remoteModified: this._formatDate(remoteModified),
          lastActiveLocal: this._formatDate(lastActiveLocal),
          lastSyncToRemote: this._formatDate(this.config._lastSyncToRemote),
          lastSyncFromRemote: this._formatDate(this.config._lastSyncFromRemote),
        }
      });
    });
  }

  private _confirmUsingExistingFileDialog(fileName): Promise<any> {
    return new Promise((resolve, reject) => {
      this._matDialog.open(DialogConfirmComponent, {
        restoreFocus: true,
        data: {
          message: `
Use <strong>existing</strong> file <strong>"${fileName}"</strong> as sync file?
If not please change the Sync file name.`,
        }
      }).afterClosed()
        .subscribe((isConfirm: boolean) => isConfirm ? resolve(true) : resolve(false));
    });
  }

  private _confirmSaveNewFile(fileName): Promise<any> {
    return new Promise((resolve, reject) => {
      this._matDialog.open(DialogConfirmComponent, {
        restoreFocus: true,
        data: {
          message: `No file with the name <strong>"${fileName}"</strong> was found.
<strong>Create</strong> it as sync file on Google Drive?`,
        }
      }).afterClosed()
        .subscribe((isConfirm: boolean) => isConfirm ? resolve(true) : resolve(false));
    });
  }

  private async _save(): Promise<any> {
    const completeData = await this._getLocalAppData();

    return this._googleApiService.saveFile(completeData, {
      title: this.config.syncFileName,
      id: this.config._backupDocId,
      editable: true
    })
      .then((res) => {
        this.updateConfig({
          _backupDocId: res.body.id,
          _lastSyncToRemote: res.body.modifiedDate,
          // also needs to be updated
          _lastLocalUpdate: res.body.modifiedDate,
          // NOTE: we can assume that overwriting the remote data also counts
          // as an update from there
          _lastSyncFromRemote: res.body.modifiedDate,
        });
      });
  }

  private _loadFile(): Promise<any> {
    if (!this.config.syncFileName) {
      return Promise.reject('No file name specified');
    }

    return this._googleApiService.loadFile(this.config._backupDocId);
  }

  private _handleInProgress(promise: Promise<any>) {
    this._isSyncingInProgress = true;
    //
    // this._clearMaxRequestDurationTimeout();
    // // block other requests only for a specified amount of itme
    // this._inProgressTimeout = window.setTimeout(() => {
    //   this._isSyncingInProgress = false;
    // }, MAX_REQUEST_DURATION);
    promise
      .then(() => {
        this._isSyncingInProgress = false;
        // this._clearMaxRequestDurationTimeout();
      })
      .catch(() => {
        this._isSyncingInProgress = false;
        // this._clearMaxRequestDurationTimeout();
      })
    ;
  }

  // private _clearMaxRequestDurationTimeout() {
  //   if (this._inProgressTimeout) {
  //     window.clearTimeout(this._inProgressTimeout);
  //   }
  // }


  // UTIL
  // ----
  private _isNewerThan(strDate1, strDate2) {
    const d1 = new Date(strDate1);
    const d2 = new Date(strDate2);
    return (d1.getTime() > d2.getTime());
  }

  private _isEqual(strDate1, strDate2) {
    const d1 = new Date(strDate1);
    const d2 = new Date(strDate2);
    return (d1.getTime() === d2.getTime());
  }

  private _getLocalAppData() {
    return this._syncService.getCompleteSyncData();
  }

  private _formatDate(date) {
    return moment(date).format('DD-MM-YYYY --- hh:mm:ss');
  }
}

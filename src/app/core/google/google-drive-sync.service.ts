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

@Injectable({
  providedIn: 'root'
})
export class GoogleDriveSyncService {
  autoSyncInterval: number;
  currentPromise: Promise<any>;

  constructor(
    private _syncService: SyncService,
    private _configService: ConfigService,
    private _googleApiService: GoogleApiService,
    private _snackService: SnackService,
    private _matDialog: MatDialog,
  ) {
    if (this.config.isEnabled && this.config.isAutoLogin) {
      _googleApiService.login().then(() => {
        if (this.config.isAutoSyncToRemote) {
          this.resetAutoSyncToRemoteInterval();
        }

        if (this.config.isLoadRemoteDataOnStartup) {
          this._checkForInitialUpdate();
        }
      });
    }
  }

  get config(): GoogleDriveSyncConfig {
    return this._configService.cfg && this._configService.cfg.googleDriveSync;
  }

  updateConfig(data: Partial<GoogleDriveSyncConfig>) {
    this._configService.updateSection('googleDriveSync', {
      ...this.config,
      ...data,
      syncFileName: data.syncFileName || this.config.syncFileName || DEFAULT_SYNC_FILE_NAME
    });
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

  saveForSyncIfEnabled(): Promise<any> {
    if (!this.config.isAutoSyncToRemote || !this.config.isEnabled) {
      return Promise.resolve();
    }

    if (this._isCurrentPromisePending()) {
      console.log('GoogleDriveSync', 'SYNC OMITTED because of promise');
      return Promise.reject();
    } else {
      console.log('GoogleDriveSync', 'SYNC');
      const promise = this.saveTo();
      if (this.config.isNotifyOnSync) {
        this._showAsyncToast(promise, 'Syncing to google drive');
      }
      return promise;
    }
  }

  async saveTo(): Promise<any> {
    // don't execute sync interactions at the same time
    if (this._isCurrentPromisePending()) {
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
    this.currentPromise = promise;
    return promise;
  }

  loadFrom(isSkipPromiseCheck = false): Promise<any> {
    const promise = new Promise((resolve, reject) => {
      const loadHandler = () => {
        this._load().then((loadRes) => {
          const lastActiveLocal = this._syncService.getLastActive();
          const lastActiveRemote = loadRes.body.lastActiveTime;

          // no update required
          if (this._isEqual(lastActiveLocal, lastActiveRemote)) {
            console.log('GoogleDriveSync', 'date comparision isEqual', lastActiveLocal, lastActiveRemote);
            this._snackService.open({
              type: 'SUCCESS',
              message: `Data already up to date`
            });
            reject();
          } else {
            // update but ask if remote data is not newer than the last local update
            const isSkipConfirm = lastActiveRemote && this._isNewerThan(lastActiveRemote, lastActiveLocal);
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
      if (!isSkipPromiseCheck && this._isCurrentPromisePending()) {
        // TODO a solution is needed
        // console.log('GoogleDriveSync', 'loadFrom omitted because is in progress', this.currentPromise, this.currentPromise.$$state.status);
        return Promise.reject('Something in progress');
      }
      // only assign this after promise check
      this.currentPromise = promise;

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

    return promise;
  }

  private _import(loadRes) {
    const backupData = loadRes.body;
    // const metaData = loadRes.meta;
    // TODO check if needed
    // // we also need to update the backup to persist it also after the import
    // backupData.googleDriveSync.lastLocalUpdate = metaData.modifiedDate;
    // // and we also need to update last sync to remote, as it kind of happened now
    // backupData.googleDriveSync.lastSyncToRemote = metaData.modifiedDate;
    // // also needs to be set to prevent double upgrades
    // backupData.lastActiveTime = new Date();

    this.updateConfig({
      _lastLocalUpdate: new Date().toString(),
      _lastSyncToRemote: new Date().toString(),
    });

    this._syncService.loadCompleteSyncData(backupData);
  }


  private _checkForInitialUpdate(): Promise<any> {
    this.currentPromise = this._googleApiService.getFileInfo(this.config._backupDocId)
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

    return this.currentPromise;
  }

  private _showAsyncToast(promise, msg) {
    console.log('XXXX Show async toast');
    this._snackService.open({
      type: 'CUSTOM',
      icon: 'file_upload',
      message: msg,
      duration: 30000,
      promise,
    });
  }

  private _confirmSaveDialog(remoteModified): Promise<any> {
    const lastActiveLocal = this._syncService.getLastActive();
    return new Promise((resolve, reject) => {
      this._matDialog.open(DialogConfirmDriveSyncSaveComponent, {
        data: {
          loadFromRemote: () => {
            this.loadFrom();
            reject.bind(this)();
          },
          saveToRemote: resolve.bind(this),
          cancel: reject.bind(this),
          lastSyncToRemote: this._formatDate(this.config._lastSyncToRemote),
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
        data: {
          loadFromRemote: resolve.bind(this),
          saveToRemote: () => {
            this.saveTo();
            reject.bind(this)();
          },
          cancel: reject,
          remoteModified: this._formatDate(remoteModified),
          lastActiveLocal: this._formatDate(lastActiveLocal),
        }
      });
    });
  }

  private _confirmUsingExistingFileDialog(fileName): Promise<any> {
    return new Promise((resolve, reject) => {
      this._matDialog.open(DialogConfirmComponent, {
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
        data: {
          message: `No file with the name <strong>"${fileName}"</strong> was found.
<strong>Create</strong> it as sync file on Google Drive?`,
        }
      }).afterClosed()
        .subscribe((isConfirm: boolean) => isConfirm ? resolve(true) : resolve(false));
    });
  }

  private _save(): Promise<any> {
    const completeData = this._getLocalAppData();

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
        });
      });
  }

  private _load(): Promise<any> {
    if (!this.config.syncFileName) {
      return Promise.reject('No file name specified');
    }

    return this._googleApiService.loadFile(this.config._backupDocId);
  }


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

  private _isCurrentPromisePending() {
    return false;
    // TODO solution for this
    // return (this.currentPromise && this.currentPromise.$$state.status === 0);
  }

  private _getLocalAppData() {
    return this._syncService.getCompleteSyncData();
  }

  private _formatDate(date) {
    return moment(date).format('DD-MM-YYYY --- hh:mm:ss');
  }
}

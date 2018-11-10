import { Injectable } from '@angular/core';
import { SyncService } from '../sync/sync.service';
import { ConfigService } from '../config/config.service';
import { GoogleDriveSyncConfig } from '../config/config.model';
import { GoogleApiService } from './google-api.service';
import * as moment from 'moment';
import { SnackService } from '../snack/snack.service';
import { DEFAULT_SYNC_FILE_NAME } from './google.const';

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
  ) {
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
      this._log('Interval too low');
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

  changeSyncFileName(newSyncFileName): Promise<any> {
    return new Promise((resolve, reject) => {
      this._googleApiService.findFile(newSyncFileName)
        .then((res) => {
          const filesFound = res.body.items;
          if (!filesFound || filesFound.length === 0) {
            this._confirmSaveNewFile(newSyncFileName)
              .then(() => {
                this.updateConfig({
                  syncFileName: newSyncFileName,
                  // we need to unset to save to a new file
                  _backupDocId: null,
                });
                this._save().then(resolve);
              }, reject);
          } else if (filesFound.length > 1) {
            this._snackService.open({
              type: 'ERROR',
              message: `Multiple files with the name "${newSyncFileName}" found. Please delete all but one or choose a different name.`
            });
            reject();
          } else if (filesFound.length === 1) {
            this._confirmUsingExistingFileDialog(newSyncFileName)
              .then(() => {
                const fileToUpdate = filesFound[0];
                this.updateConfig({
                  syncFileName: newSyncFileName,
                  _backupDocId: fileToUpdate.id,
                });
                resolve(fileToUpdate.id);
              }, reject);
          }
        });
    });
  }

  saveForSyncIfEnabled(): Promise<any> {
    if (!this.config.isAutoSyncToRemote || !this.config.isEnabled) {
      return Promise.resolve();
    }

    if (this._isCurrentPromisePending()) {
      // this._log('SYNC OMITTED because of promise', this.currentPromise, this.currentPromise.$$state.status);
      return Promise.reject();
    } else {
      this._log('SYNC');
      const promise = this.saveTo();
      if (this.config.isNotifyOnSync) {
        this._showAsyncToast(promise, 'Syncing to google drive');
      }
      return promise;
    }
  }

  saveTo(): Promise<any> {
    // don't execute sync interactions at the same time
    if (this._isCurrentPromisePending()) {
      // this._log('saveTo omitted because is in progress', this.currentPromise, this.currentPromise.$$state.status);
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
          // const lastModifiedRemote = loadRes.meta.modifiedDate;
          // TODO create a solution for this
          // const lastActiveLocal = this.$rootScope.r.lastActiveTime;
          const lastActiveLocal = this._syncService.getLastActive();
          const lastActiveRemote = loadRes.body.lastActiveTime;

          // no update required
          if (this._isEqual(lastActiveLocal, lastActiveRemote)) {
            this._log('date comparision isEqual', lastActiveLocal, lastActiveRemote);
            this._snackService.open({
              type: 'SUCCESS',
              message: `Data already up to date`
            });
            reject();
          } else {
            // update but ask if remote data is not newer than the last local update
            const isSkipConfirm = lastActiveRemote && this._isNewerThan(lastActiveRemote, lastActiveLocal);
            this._log('date comparision skipConfirm', isSkipConfirm, lastActiveLocal, lastActiveRemote);

            if (isSkipConfirm) {
              this._import(loadRes);
              resolve(loadRes);
            } else {
              this._confirmLoadDialog(lastActiveRemote, lastActiveLocal)
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
        // this._log('loadFrom omitted because is in progress', this.currentPromise, this.currentPromise.$$state.status);
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


  private _log(...args) {
    console.log(this.constructor.name + ':', ...args);
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
        this._log(
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

          this._log('HAS CHANGED (modified Date comparision), TRYING TO UPDATE');
          this.loadFrom(true);
        }
      });

    return this.currentPromise;
  }

  private _showAsyncToast(promise, msg) {
//     const icon = 'file_upload';
//     this.$mdToast.show({
//       hideDelay: (promise ? (15 * 1000) : (5 * 1000)),
//       controller:
//       /* @ngInject */
//         ($mdToast) => {
//           if (promise) {
//             promise.then($mdToast.hide, $mdToast.hide);
//           }
//         },
//       template: `
// <md-toast>
//   <div class="md-toast-content" flex>
//     <div class="icon-wrapper">
//       <ng-md-icon icon="${icon}"></ng-md-icon>
//     </div>
//     <div class="toast-text">${msg}</div>
//     <md-progress-linear md-mode="indeterminate"
//       style="position: absolute; top: 0; left: 0;"></md-progress-linear>
//   </div>
// </md-toast>`
//     });
  }

  private _confirmSaveDialog(remoteModified): Promise<any> {
    return Promise.resolve();

//     const lastActiveLocal = this.$rootScope.r.lastActiveTime;
//
//     return this.$mdDialog.show({
//       template: `
// <md-dialog>
//   <md-dialog-content>
//     <div class="md-dialog-content">
//       <h2 class="md-title" style="margin-top: 0">Overwrite unsaved data on Google Drive?</h2>
//       <p>There seem to be some changes on Google Drive, that you don't have locally. Do you want to overwrite them anyway?</p>
//       <table>
//         <tr>
//           <td>Last modification of remote data:</td>
//           <td> ${this._formatDate(remoteModified)}</td>
//         </tr>
//         <tr>
//           <td>Last modification of local data:</td>
//           <td> ${this._formatDate(lastActiveLocal)}</td>
//         </tr>
//         <tr>
//           <td>Last sync to remote from this app instance:</td>
//           <td> ${this._formatDate(this.config._lastSyncToRemote)}</td>
//         </tr>
//       </table>
//     </div>
//   </md-dialog-content>
//
//   <md-dialog-actions>
//     <md-button ng-click="saveToRemote()" class="md-primary">
//         <ng-md-icon icon="file_upload"
//                     aria-label="file_upload"></ng-md-icon> Overwrite remote data
//     </md-button>
//     <md-button ng-click="loadFromRemote()" class="md-primary">
//       <ng-md-icon icon="file_download"
//                     aria-label="file_download"></ng-md-icon> Overwrite local data
//     </md-button>
//     <md-button ng-click="cancel()" class="md-primary md-warn">
//       Abort
//     </md-button>
//   </md-dialog-actions>
// </md-dialog>`,
//       controller:
//       /* @ngInject */
//         ($mdDialog, $scope, GoogleDriveSync) => {
//           $scope.saveToRemote = () => {
//             $mdDialog.hide();
//           };
//
//           $scope.loadFromRemote = () => {
//             $mdDialog.cancel();
//             // we need some time so the promise is canceled
//             setTimeout(() => {
//               GoogleDriveSync.loadFrom();
//             }, 100);
//           };
//
//           $scope.cancel = () => {
//             $mdDialog.cancel();
//           };
//         },
//     });
  }

  private _confirmLoadDialog(remoteModified, lastActiveLocal): Promise<any> {
    return Promise.resolve();
//     return this.$mdDialog.show({
//       template: `
// <md-dialog>
//   <md-dialog-content>
//     <div class="md-dialog-content">
//       <h2 class="md-title" style="margin-top: 0">Overwrite local data with GDrive Update?</h2>
//       <p>Update from Google Drive Backup. <strong>Local data seems to be newer</strong> than the remote data.  Overwrite unsaved local changes? <strong>All data will be lost forever</strong>.</p>
//       <table>
//         <tr>
//           <td>Last modification of remote data:</td>
//           <td> ${this._formatDate(remoteModified)}</td>
//         </tr>
//         <tr>
//           <td>Last modification of local data:</td>
//           <td> ${this._formatDate(lastActiveLocal)}</td>
//         </tr>
//       </table>
//     </div>
//   </md-dialog-content>
//
//   <md-dialog-actions>
//     <md-button ng-click="saveToRemote()" class="md-primary">
//       <ng-md-icon icon="file_upload"
//                     aria-label="file_upload"></ng-md-icon> Overwrite remote data
//     </md-button>
//     <md-button ng-click="loadFromRemote()" class="md-primary">
//         <ng-md-icon icon="file_download"
//                     aria-label="file_download"></ng-md-icon> Overwrite local data
//     </md-button>
//     <md-button ng-click="cancel()" class="md-primary md-warn">
//       Abort
//     </md-button>
//   </md-dialog-actions>
// </md-dialog>`,
//       controller:
//       /* @ngInject */
//         ($mdDialog, $scope, GoogleDriveSync) => {
//           $scope.loadFromRemote = () => {
//             $mdDialog.hide();
//           };
//
//           $scope.saveToRemote = () => {
//             $mdDialog.cancel();
//             // we need some time so the promise is canceled
//             setTimeout(() => {
//               GoogleDriveSync.saveTo();
//             }, 100);
//           };
//
//           $scope.cancel = () => {
//             $mdDialog.cancel();
//           };
//         },
//     });
  }

  private _confirmUsingExistingFileDialog(fileName): Promise<any> {
    return Promise.resolve();

    // const confirm = this.$mdDialog.confirm()
    //   .title(`Use existing file "${fileName}" as sync file?`)
    //   .textContent(`
    //     We found a file with the name you specified. Do you want to use it as your sync file? If not please change the Sync file name.`)
    //   .ok('Please do it!')
    //   .cancel('Abort');
    //
    // return this.$mdDialog.show(confirm);
  }

  private _confirmSaveNewFile(fileName): Promise<any> {
    return Promise.resolve();

    // const confirm = this.$mdDialog.confirm()
    //   .title(`Create "${fileName}" as sync file on Google Drive?`)
    //   .textContent(`
    //     No file with the name you specified was found. Do you want to create it?`)
    //   .ok('Please do it!')
    //   .cancel('Abort');
    //
    // return this.$mdDialog.show(confirm);
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

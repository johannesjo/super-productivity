/**
 * @ngdoc service
 * @name superProductivity.GoogleDriveSync
 * @description
 * # GoogleDriveSync
 * Service in the superProductivity.
 */

(() => {
  'use strict';

  const DEFAULT_SYNC_FILE_NAME = 'SUPER_PRODUCTIVITY_SYNC.json';

  class GoogleDriveSync {
    /* @ngInject */
    constructor(AppStorage, GoogleApi, $rootScope, SimpleToast, $mdDialog, $q, $interval) {
      this.AppStorage = AppStorage;
      this.GoogleApi = GoogleApi;
      this.$rootScope = $rootScope;
      this.SimpleToast = SimpleToast;
      this.$mdDialog = $mdDialog;
      this.$interval = $interval;
      this.$q = $q;

      this.data = this.$rootScope.r.googleDriveSync;
      this.config = this.$rootScope.r.config.googleDriveSync;

      if (this.config.isAutoLogin) {
        GoogleApi.login();
      }
      if (this.config.isAutoSyncToRemote) {
        this.resetAutoSyncToRemoteInterval();
      }

      if (this.config.isLoadRemoteDataOnStartup) {
        this.GoogleApi.getFileInfo(this.data.backupDocId)
          .then((res) => {
            const lastModifiedRemote = res.data.modifiedDate;
            console.log(
              'GoogleDriveSync:',
              this._formatDate(lastModifiedRemote),
              ' > ',
              this._formatDate(this.data.lastLocalUpdate),
              this._isNewerThan(lastModifiedRemote, this.data.lastLocalUpdate)
            );

            if (this._isNewerThan(lastModifiedRemote, this.data.lastLocalUpdate)) {
              console.log('GoogleDriveSync: HAS CHANGED, TRYING TO UPDATE');
              const lastActiveTime = this.$rootScope.r.lastActiveTime;
              const isSkipConfirm = this._isNewerThan(lastModifiedRemote, lastActiveTime);
              console.log('GoogleDriveSync: Skipping Dialog', isSkipConfirm);
              this.loadFrom(isSkipConfirm);
            }
          });
      }
    }

    _import(loadRes) {
      const backupData = loadRes.backup;
      const metaData = loadRes.meta;

      // we also need to update the backup to persist it also after the import
      backupData.googleDriveSync.lastLocalUpdate = this.data.lastLocalUpdate = metaData.modifiedDate;
      // and we also need to update last sync to remote, as it kind of happened now
      backupData.googleDriveSync.lastSyncToRemote = this.data.lastSyncToRemote = metaData.modifiedDate;
      // also needs to be set to prevent double upgrades
      backupData.lastActiveTime = new Date();

      this.AppStorage.importData(backupData);
    }

    _isNewerThan(strDate1, strDate2) {
      const d1 = new Date(strDate1);
      const d2 = new Date(strDate2);
      return (d1.getTime() > d2.getTime());
    }

    _getLocalAppData() {
      return this.AppStorage.getCompleteBackupData();
    }

    _formatDate(date) {
      return window.moment(date).format('DD-MM-YYYY * hh:mm:ss');
    }

    _confirmSaveDialog(remoteModified) {
      const confirm = this.$mdDialog.confirm()
        .title('Overwrite unsaved data on Google Drive?')
        .textContent(`
        There seem to be some changes on Google Drive, that you don\'t have locally. Do you want to overwrite them anyway? 
        -- Last modification of remote data: ${this._formatDate(remoteModified)} 
        -- Last sync to remote from this app instance: ${this._formatDate(this.data.lastSyncToRemote)}.`)
        .ok('Please do it!')
        .cancel('No');

      return this.$mdDialog.show(confirm);
    }

    _confirmLoadDialog(remoteModified) {
      const confirm = this.$mdDialog.confirm()
        .title('Update from Google Drive Backup')
        .textContent(`
        Overwrite unsaved local changes? All data will be lost forever. 
        -- Last modification of remote data: ${this._formatDate(remoteModified)}`)
        .ok('Please do it!')
        .cancel('No');

      return this.$mdDialog.show(confirm);
    }

    _confirmUsingExistingFileDialog(fileName) {
      const confirm = this.$mdDialog.confirm()
        .title(`Use existing file "${fileName}" as sync file?`)
        .textContent(`
        We found a file with the name you specified. Do you want to use it as your sync file? If not please change the Sync file name.`)
        .ok('Please do it!')
        .cancel('Abort');

      return this.$mdDialog.show(confirm);
    }

    _save() {
      const completeData = this._getLocalAppData();

      return this.GoogleApi.saveFile(completeData, {
        title: this.config.syncFileName,
        id: this.data.backupDocId,
        editable: true
      })
        .then((res) => {
          this.data.backupDocId = res.data.id;
          this.data.lastSyncToRemote = res.data.modifiedDate;
          // also needs to be updated
          this.data.lastLocalUpdate = res.data.modifiedDate;
        });
    }

    _load() {
      if (!this.config.syncFileName) {
        return this.$q.reject('No file name specified');
      }

      return this.GoogleApi.loadFile(this.data.backupDocId)
        .then((res) => {
          return this.$q.when(res);
        });
    }

    resetAutoSyncToRemoteInterval() {
      // always unset if set
      this.cancelAutoSyncToRemoteIntervalIfSet();
      if (!this.config.isAutoSyncToRemote) {
        return;
      }

      const interval = window.moment.duration(this.config.syncInterval).asMilliseconds();

      if (interval < 5000) {
        console.log('GoogleDriveSync: Interval too low');
        return;
      }

      this.autoSyncInterval = this.$interval(() => {
        // only sync if not in the middle of something
        if (!this.currentPromise || this.currentPromise.$$state.status === 1) {
          console.log('GoogleDriveSync: SYNC');
          this.saveTo();
        } else {
          console.log('GoogleDriveSync: SYNC OMITTED because of promise');
        }
      }, interval);
    }

    cancelAutoSyncToRemoteIntervalIfSet() {
      if (this.autoSyncInterval) {
        this.$interval.cancel(this.autoSyncInterval);
      }
    }

    saveTo() {
      const defer = this.$q.defer();
      this.currentPromise = defer.promise;

      // CREATE OR FIND
      // ---------------------------
      // when we have no backup file we create one directly
      if (!this.data.backupDocId) {
        if (!this.config.syncFileName) {
          this.config.syncFileName = DEFAULT_SYNC_FILE_NAME;
        }

        this.GoogleApi.findFile(this.config.syncFileName)
          .then((res) => {
            const filesFound = res.data.items;
            if (!filesFound || filesFound.length === 0) {
              this.SimpleToast('CUSTOM', `GoogleDriveSync: No file with the name "${this.config.syncFileName}" found. Creating it now...`, 'file_upload');
              this._save().then(defer.resolve);
            } else if (filesFound.length > 1) {
              this.SimpleToast('ERROR', `GoogleDriveSync: Multiple files with the name "${this.config.syncFileName}" found. Please delete all but one or choose a different name.`);
              defer.reject();
            } else if (filesFound.length === 1) {
              this._confirmUsingExistingFileDialog(this.config.syncFileName)
                .then(() => {
                  const fileToUpdate = filesFound[0];
                  this.data.backupDocId = fileToUpdate.id;
                  this._save().then(defer.resolve);
                }, defer.reject);
            }
          });

        // JUST UPDATE
        // ---------------------------
        // otherwise update
      } else {
        this.GoogleApi.getFileInfo(this.data.backupDocId)
          .then((res) => {
            const lastModifiedRemote = res.data.modifiedDate;

            if (this._isNewerThan(lastModifiedRemote, this.data.lastSyncToRemote)) {
              // remote has an update so prompt what to do
              this._confirmSaveDialog(lastModifiedRemote)
                .then(() => {
                  this._save().then(defer.resolve);
                }, defer.reject);
            } else {
              // all clear just save
              this._save().then(defer.resolve);
            }
          })
          .catch(defer.reject);
      }

      return defer.promise;
    }

    loadFrom(isSkipPrompt = false) {
      const defer = this.$q.defer();
      this.currentPromise = defer.promise;

      if (isSkipPrompt) {
        this._load().then((loadRes) => {
          this._import(loadRes);
          defer.resolve(loadRes);
        });
      } else {
        this._load().then((loadRes) => {
          const lastModifiedRemote = loadRes.meta.modifiedDate;
          this._confirmLoadDialog(lastModifiedRemote)
            .then(() => {
              this._import(loadRes);
              defer.resolve(loadRes);
            }, defer.reject);
        });
      }

      return defer.promise;
    }
  }

  angular
    .module('superProductivity')
    .service('GoogleDriveSync', GoogleDriveSync);

  // hacky fix for ff
  GoogleDriveSync.$$ngIsClass = true;
})();

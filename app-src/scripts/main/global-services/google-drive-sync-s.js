/**
 * @ngdoc service
 * @name superProductivity.GoogleDriveSync
 * @description
 * # GoogleDriveSync
 * Service in the superProductivity.
 */

(() => {
  'use strict';

  const SYNC_FILE_NAME = 'SUPER_PRODUCTIVITY_SYNC.json';

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
            console.log(lastModifiedRemote, this.data.lastLocalUpdate);

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

    // TODO check for valid data
    _isValidData(data) {
      return data.tasks && data.backlogTasks && data.config;
    }

    _getLocalAppData() {
      return this.AppStorage.getCompleteBackupData();
    }

    _formatDate(date) {
      return window.moment(date).format('DD-MM-YYYY hh:mm:ss');
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

    _save() {
      const completeData = this._getLocalAppData();

      return this.GoogleApi.saveFile(completeData, {
        title: SYNC_FILE_NAME,
        id: this.data.backupDocId,
        editable: true
      })
        .then((res) => {
          if (res && res.data) {
            this.data.backupDocId = res.data.id;
            this.data.lastSyncToRemote = res.data.modifiedDate;
          }
        });
    }

    _load() {
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
        console.log('GoogleDriveSync: SYNC');
        this.saveTo();
      }, interval);
    }

    cancelAutoSyncToRemoteIntervalIfSet() {
      if (this.autoSyncInterval) {
        this.$interval.cancel(this.autoSyncInterval);
      }
    }

    saveTo() {
      const defer = this.$q.defer();

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

      return defer.promise;
    }

    loadFrom(isSkipPrompt = false) {
      const defer = this.$q.defer();

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

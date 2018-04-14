/**
 * @ngdoc service
 * @name superProductivity.LocalSync
 * @description
 * # LocalSync
 * Service in the superProductivity.
 */

(() => {
  'use strict';

  class LocalSync {
    /* @ngInject */
    constructor($rootScope, IS_ELECTRON, $interval, AppStorage) {
      this.$rootScope = $rootScope;
      this.IS_ELECTRON = IS_ELECTRON;
      this.$interval = $interval;
      this.AppStorage = AppStorage;

      if (IS_ELECTRON) {
        this.fs = require('fs');
      }
    }

    initBackupsIfEnabled() {
      if (!this.IS_ELECTRON ||
        !this.$rootScope.r.config.automaticBackups ||
        !this.$rootScope.r.config.automaticBackups.isEnabled) {
        return;
      }

      const interval = parseInt(this.$rootScope.r.config.automaticBackups.intervalInSeconds, 10) * 1000;

      this.$interval(() => {
        if (!this.$rootScope.r.config.automaticBackups ||
          !this.$rootScope.r.config.automaticBackups.isEnabled ||
          parseInt(this.$rootScope.r.config.automaticBackups.intervalInSeconds, 10) === 0 ||
          !this.$rootScope.r.config.automaticBackups.path ||
          this.$rootScope.r.config.automaticBackups.path.trim().length === 0
        ) {
          return;
        }

        const now = window.moment();
        const path = this.$rootScope.r.config.automaticBackups.path
          .replace('{date}', now.format('YYYY-MM-DD'))
          .replace('{unix}', now.format('x'));

        this.saveToFileSystem(path);
      }, interval);
    }

    loadFromFileSystem(path) {
      if (this.fs.existsSync(path)) {
        const data = JSON.parse(this.fs.readFileSync(path, 'utf-8'));
        this.AppStorage.importData(data);
      }
    }

    initSyncIfEnabled() {
      if (!this.IS_ELECTRON ||
        !this.$rootScope.r.config.automaticBackups ||
        !this.$rootScope.r.config.automaticBackups.isSyncEnabled) {
        return;
      }

      // load once initially
      const path = this.$rootScope.r.config.automaticBackups.syncPath;
      this.loadFromFileSystem(path);

      // init load
      this.fs.watchFile(this.$rootScope.r.config.automaticBackups.syncPath, (curr) => {
        const newFileTime = curr && curr.ctime && moment(curr.ctime);
        const isOutsideChange = newFileTime.isAfter(moment(this.lastSyncSaveChangedTime));

        if (isOutsideChange) {
          const path = this.$rootScope.r.config.automaticBackups.syncPath;
          this.loadFromFileSystem(path);
        }
      });

      this.reInitLocalSyncInterval();
    }

    clearLocalSyncIntervalIfSet() {
      if (!this.localSyncInterval) {
        this.$interval.cancel(this.localSyncInterval);
      }
    }

    saveToFileSystem(path, cb, isSync) {
      const data = this.AppStorage.getCompleteBackupData();
      this.fs.writeFile(path, JSON.stringify(data), { flag: 'w' }, (err) => {
        if (err) {
          console.error(err);
        } else {
          if (isSync) {
            console.log('Sync saved to ' + path + ' completed');
          } else {
            console.log('Backup to ' + path + ' completed');
          }

          if (cb) {
            cb();
          }
        }
      });
    }

    reInitLocalSyncInterval() {
      this.clearLocalSyncIntervalIfSet();

      const SYNC_INTERVAL = 10000;
      // init save
      this.localSyncInterval = this.$interval(() => {
        if (!this.$rootScope.r.config.automaticBackups ||
          !this.$rootScope.r.config.automaticBackups.isSyncEnabled ||
          parseInt(this.$rootScope.r.config.automaticBackups.intervalInSeconds, 10) === 0 ||
          !this.$rootScope.r.config.automaticBackups.syncPath ||
          this.$rootScope.r.config.automaticBackups.syncPath.trim().length === 0
        ) {
          return;
        }

        const path = this.$rootScope.r.config.automaticBackups.syncPath;

        this.saveToFileSystem(path, () => {
          const stats = this.fs.statSync(path);
          this.lastSyncSaveChangedTime = stats.ctime;
        }, true);
      }, SYNC_INTERVAL);
    }
  }

  angular
    .module('superProductivity')
    .service('LocalSync', LocalSync);

  // hacky fix for ff
  LocalSync.$$ngIsClass = true;
})();

/**
 * @ngdoc service
 * @name superProductivity.$rootScope
 * @description
 * # $rootScope
 * Service in the superProductivity.
 */

(() => {
  'use strict';

  const PREFIX = 'ngStorage-';

  class AppStorage {
    /* @ngInject */
    constructor(LS_DEFAULTS, SAVE_APP_STORAGE_POLL_INTERVAL, TMP_FIELDS, $interval, $rootScope, ON_DEMAND_LS_FIELDS, ON_DEMAND_LS_FIELDS_FOR_PROJECT, IS_ELECTRON, SimpleToast) {
      this.PROJECTS_KEY = 'projects';
      this.DONE_BACKLOG_TASKS_KEY = 'doneBacklogTasks';
      this.LS_DEFAULTS = LS_DEFAULTS;
      this.TMP_FIELDS = TMP_FIELDS;
      this.SAVE_APP_STORAGE_POLL_INTERVAL = SAVE_APP_STORAGE_POLL_INTERVAL;
      this.ON_DEMAND_LS_FIELDS = ON_DEMAND_LS_FIELDS;
      this.ON_DEMAND_LS_FIELDS_FOR_PROJECT = ON_DEMAND_LS_FIELDS_FOR_PROJECT;
      this.IS_ELECTRON = IS_ELECTRON;
      this.$rootScope = $rootScope;
      this.SimpleToast = SimpleToast;
      this.$interval = $interval;
      this.serializer = angular.toJson;
      this.deserializer = angular.fromJson;
      this.s = {};

      this.getCurrentLs();
      this.setupPollingForSavingCurrentState();

      // this is really nice for debugging but we don't want to use it for
      // actual saving the data as it is costly to run
      //window.watch(this.s, function(prop, action, difference, oldvalue) {
      //  console.log(prop, action, difference, oldvalue);
      //}, 5);
    }

    initBackupsIfEnabled() {
      if (!this.IS_ELECTRON ||
        !this.$rootScope.r.config.automaticBackups ||
        !this.$rootScope.r.config.automaticBackups.isEnabled) {
        return;
      }
      const fs = require('fs');
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

        this.saveToFileSystem(fs, path);
      }, interval);
    }

    initSyncIfEnabled() {
      let lastSyncSaveChangedTime;
      const SYNC_INTERVAL = 10000;
      if (!this.IS_ELECTRON ||
        !this.$rootScope.r.config.automaticBackups ||
        !this.$rootScope.r.config.automaticBackups.isSyncEnabled) {
        return;
      }

      const fs = require('fs');

      // load once initially
      const path = this.$rootScope.r.config.automaticBackups.syncPath;
      this.loadFromFileSystem(fs, path);

      // init load
      fs.watchFile(this.$rootScope.r.config.automaticBackups.syncPath, (curr) => {
        const newFileTime = curr && curr.ctime && moment(curr.ctime);
        const isOutsideChange = newFileTime.isAfter(moment(lastSyncSaveChangedTime));

        if (isOutsideChange) {
          const path = this.$rootScope.r.config.automaticBackups.syncPath;
          this.loadFromFileSystem(fs, path);

          // TODO find a better way to do so
          window.location.reload(true);
        }
      });

      // init save
      this.$interval(() => {
        if (!this.$rootScope.r.config.automaticBackups ||
          !this.$rootScope.r.config.automaticBackups.isSyncEnabled ||
          parseInt(this.$rootScope.r.config.automaticBackups.intervalInSeconds, 10) === 0 ||
          !this.$rootScope.r.config.automaticBackups.syncPath ||
          this.$rootScope.r.config.automaticBackups.syncPath.trim().length === 0
        ) {
          return;
        }

        const path = this.$rootScope.r.config.automaticBackups.syncPath;

        this.saveToFileSystem(fs, path, () => {
          const stats = fs.statSync(path);
          lastSyncSaveChangedTime = stats.ctime;
        }, true);
      }, SYNC_INTERVAL);
    }

    loadFromFileSystem(fs, path) {
      if (fs.existsSync(path)) {
        const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
        this.importData(data);
        this.SimpleToast('CUSTOM', 'Data updated from the outside. Updating...', 'update');
      }
    }

    getCompleteBackupData() {
      const data = angular.copy(this.getCurrentAppState());
      // also add projects data
      data[this.PROJECTS_KEY] = this.getProjects();
      // also add backlog tasks
      data[this.DONE_BACKLOG_TASKS_KEY] = this.getDoneBacklogTasks();
      return data;
    }

    saveToFileSystem(fs, path, cb, isSync) {
      const data = this.getCompleteBackupData();

      fs.writeFile(path, JSON.stringify(data), function(err) {
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

    setupPollingForSavingCurrentState() {
      this.updateLsInterval = this.$interval(() => {
        this.saveToLs();
      }, this.SAVE_APP_STORAGE_POLL_INTERVAL);
    }

    // gets the current state of the app excluding tmp variables and the projects
    getCurrentAppState() {
      const currentState = {};
      for (let key in this.LS_DEFAULTS) {
        const isNoTmpField = (this.TMP_FIELDS.indexOf(key) === -1);
        const isNoOnDemand = (this.ON_DEMAND_LS_FIELDS.indexOf(key) === -1);
        const isNotProjects = (key !== this.PROJECTS_KEY);
        if (this.LS_DEFAULTS.hasOwnProperty(key) && isNoOnDemand && isNoTmpField && isNotProjects) {
          currentState[key] = this.$rootScope.r[key];
        }
      }
      return currentState;
    }

    getDoneBacklogTasks() {
      const projects = this.getProjects();

      if (projects && this.$rootScope.r.currentProject && this.$rootScope.r.currentProject.id) {
        const currentProject = _.find(projects, ['id', this.$rootScope.r.currentProject.id]);
        return currentProject.data[this.DONE_BACKLOG_TASKS_KEY];
      } else {
        return this.getLsItem(this.DONE_BACKLOG_TASKS_KEY);
      }
    }

    saveDoneBacklogTasks(doneBacklogTasks) {
      if (Array.isArray(doneBacklogTasks)) {
        const projects = this.getProjects();

        // we also need to save the backlog tasks to the current project
        if (projects && this.$rootScope.r.currentProject && this.$rootScope.r.currentProject.id) {

          const currentProject = _.find(projects, ['id', this.$rootScope.r.currentProject.id]);
          currentProject.data[this.DONE_BACKLOG_TASKS_KEY] = doneBacklogTasks;
          this.saveProjects(projects);
        } else {
          this.saveLsItem(doneBacklogTasks, this.DONE_BACKLOG_TASKS_KEY);
        }
      }
    }

    saveToLs() {
      const currentState = this.getCurrentAppState();
      for (let key in currentState) {
        this.saveLsItem(currentState[key], key);
      }
    }

    importData(data) {
      this.SimpleToast('ERROR', 'If you can see this, something went wrong importing your data.');

      // cancel saving current app data to ls
      if (this.updateLsInterval) {
        this.$interval.cancel(this.updateLsInterval);
      }

      _.forOwn(data, (val, key) => {
        this.saveLsItem(val, key);
      });

      // reload page completely afterwards
      window.location.reload(true);
    }

    getProjects() {
      return this.getLsItem(this.PROJECTS_KEY);
    }

    saveProjects(data) {
      this.saveLsItem(data, this.PROJECTS_KEY);
    }

    getLsItem(key) {
      const lsStr = window.localStorage.getItem(PREFIX + key);
      if (lsStr) {
        return this.deserializer(lsStr);
      }
    }

    saveLsItem(data, key) {
      const strToSave = data ? this.serializer(data) : '';
      window.localStorage.setItem(PREFIX + key, strToSave);
    }

    makeProjectsSimple(projects) {
      // remove on demand fields
      _.each(projects, (project) => {
        _.forOwn(project, (val, prop) => {
          if (this.ON_DEMAND_LS_FIELDS_FOR_PROJECT.indexOf(prop) !== -1) {
            delete project[prop];
          }
        });
      });
      return projects;
    }

    getDefaultsForDeepObject(newConfigObj, originalConfigObj) {
      if (!originalConfigObj) {
        return newConfigObj;
      }

      const keys = Object.keys(originalConfigObj);
      const newObj = {};

      keys.forEach((key) => {
        const item = newConfigObj[key];

        // reassign to original value, but only when the item is undefined
        if (item === undefined) {
          newObj[key] = originalConfigObj[key];
        } else {
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            newObj[key] = this.getDefaultsForDeepObject(item, originalConfigObj[key]);
          } else {
            newObj[key] = newConfigObj[key];
          }

        }
      });

      return newObj;
    }

    getCurrentLs() {
      const keys = Object.keys(this.LS_DEFAULTS);

      keys.forEach((key) => {
        const item = this.getLsItem(key);

        // reassign to original value, but only when the item is undefined
        if (item === undefined) {
          this.s[key] = this.LS_DEFAULTS[key];

        } else {
          // deep check object defaults
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            this.s[key] = this.getDefaultsForDeepObject(item, this.LS_DEFAULTS[key]);
          } else {
            this.s[key] = item;
          }

          if (key === this.PROJECTS_KEY) {
            const projects = this.s[key];
            this.makeProjectsSimple(projects);
          }
        }
      });

      return this.s;
    }
  }

  angular
    .module('superProductivity')
    .service('AppStorage', AppStorage);

  // hacky fix for ff
  AppStorage.$$ngIsClass = true;
})();

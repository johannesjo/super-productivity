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
    constructor(LS_DEFAULTS, SAVE_APP_STORAGE_POLL_INTERVAL, TMP_FIELDS, $interval, $rootScope, ON_DEMAND_LS_FIELDS, ON_DEMAND_LS_FIELDS_FOR_PROJECT, IS_ELECTRON) {
      this.PROJECTS_KEY = 'projects';
      this.LS_DEFAULTS = LS_DEFAULTS;
      this.TMP_FIELDS = TMP_FIELDS;
      this.SAVE_APP_STORAGE_POLL_INTERVAL = SAVE_APP_STORAGE_POLL_INTERVAL;
      this.ON_DEMAND_LS_FIELDS = ON_DEMAND_LS_FIELDS;
      this.ON_DEMAND_LS_FIELDS_FOR_PROJECT = ON_DEMAND_LS_FIELDS_FOR_PROJECT;
      this.IS_ELECTRON = IS_ELECTRON;
      this.$rootScope = $rootScope;
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
      if (!this.IS_ELECTRON
        || !this.$rootScope.r.config.automaticBackups
        || !this.$rootScope.r.config.automaticBackups.isEnabled) {
        return;
      }
      const fs = require('fs');
      const interval = parseInt(this.$rootScope.r.config.automaticBackups.intervalInSeconds, 10) * 1000;

      this.$interval(() => {
        if (!this.$rootScope.r.config.automaticBackups
          || !this.$rootScope.r.config.automaticBackups.isEnabled
          || parseInt(this.$rootScope.r.config.automaticBackups.intervalInSeconds, 10) === 0
          || !this.$rootScope.r.config.automaticBackups.path
          || !this.$rootScope.r.config.automaticBackups.path.trim().length > 0
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

    saveToFileSystem(fs, path) {
      const data = angular.copy(this.getCurrentAppState());

      // also add projects data
      data[this.PROJECTS_KEY] = this.getProjects();

      fs.writeFile(path, JSON.stringify(data), function(err) {
        if (err) {
          console.error(err);
        } else {
          console.log('Backup to ' + path + ' completed');
        }
      });
    }

    setupPollingForSavingCurrentState() {
      this.$interval(() => {
        this.saveToLs();
      }, this.SAVE_APP_STORAGE_POLL_INTERVAL);
    }

    // gets the current state of the app excluding tmp variables and the projects
    getCurrentAppState() {
      const currentState = {};
      for (let key in this.LS_DEFAULTS) {
        const isNoTmpField = this.TMP_FIELDS.indexOf(key) === -1;
        if (this.LS_DEFAULTS.hasOwnProperty(key) && isNoTmpField && key !== this.PROJECTS_KEY) {
          currentState[key] = this.$rootScope.r[key];
        }
      }
      return currentState;
    }

    saveToLs() {
      const currentState = this.getCurrentAppState();
      for (let key in currentState) {
        this.saveLsItem(currentState[key], key);
      }
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

    getCurrentLs() {
      const keys = Object.keys(this.LS_DEFAULTS);

      keys.forEach((key) => {
        const item = this.getLsItem(key);
        if (item) {
          this.s[key] = item;

          if (key === this.PROJECTS_KEY) {
            const projects = this.s[key];

            // remove on demand fields
            _.each(projects, (project) => {
              _.forOwn(project, (val, prop) => {
                if (this.ON_DEMAND_LS_FIELDS_FOR_PROJECT.indexOf(prop) !== -1) {
                  delete project[prop];
                }
              });
            });
          }
        } else {
          this.s[key] = this.LS_DEFAULTS[key];
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

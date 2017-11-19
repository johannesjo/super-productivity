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
    constructor(LS_DEFAULTS, SAVE_APP_STORAGE_POLL_INTERVAL, TMP_FIELDS, $interval, $rootScope, ON_DEMAND_LS_FIELDS, ON_DEMAND_LS_FIELDS_FOR_PROJECT) {
      this.PROJECTS_KEY = 'projects';
      this.LS_DEFAULTS = LS_DEFAULTS;
      this.TMP_FIELDS = TMP_FIELDS;
      this.SAVE_APP_STORAGE_POLL_INTERVAL = SAVE_APP_STORAGE_POLL_INTERVAL;
      this.ON_DEMAND_LS_FIELDS = ON_DEMAND_LS_FIELDS;
      this.ON_DEMAND_LS_FIELDS_FOR_PROJECT = ON_DEMAND_LS_FIELDS_FOR_PROJECT;
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

    setupPollingForSavingCurrentState() {
      this.$interval(() => {
        this.saveToLs();
      }, this.SAVE_APP_STORAGE_POLL_INTERVAL);
    }

    saveToLs() {
      for (let key in this.$rootScope.r) {
        const isNoTmpField = this.TMP_FIELDS.indexOf(key) === -1;
        if (this.$rootScope.r.hasOwnProperty(key) && isNoTmpField && key !== this.PROJECTS_KEY) {
          this.saveLsItem(this.$rootScope.r[key], key);
        }
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

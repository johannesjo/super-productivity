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
    constructor(LS_DEFAULTS, SAVE_APP_STORAGE_POLL_INTERVAL, TMP_FIELDS, $interval, $rootScope) {
      this.LS_DEFAULTS = LS_DEFAULTS;
      this.TMP_FIELDS = TMP_FIELDS;
      this.SAVE_APP_STORAGE_POLL_INTERVAL = SAVE_APP_STORAGE_POLL_INTERVAL;
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
        if (this.$rootScope.r.hasOwnProperty(key) && isNoTmpField) {
          const strToSave = this.$rootScope.r[key] ? this.serializer(this.$rootScope.r[key]) : '';
          window.localStorage.setItem(PREFIX + key, strToSave);
        }
      }
    }

    getCurrentLs() {
      const keys = Object.keys(this.LS_DEFAULTS);

      keys.forEach((key) => {
        const item = window.localStorage.getItem(PREFIX + key);
        if (item) {
          this.s[key] = item && this.deserializer(item);
        } else {
          this.s[key] = this.LS_DEFAULTS[key];
        }
      });
    }
  }

  angular
    .module('superProductivity')
    .service('AppStorage', AppStorage);

  // hacky fix for ff
  AppStorage.$$ngIsClass = true;
})();

/**
 * @ngdoc service
 * @name superProductivity.Tasks
 * @description
 * # Tasks
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .service('Tasks', Tasks);

  //if (angular.isDefined(require)) {
  //  const Config = require('electron-config');
  //  const config = new Config();
  //}

  /* @ngInject */
  function Tasks($localStorage, $q) {
    $localStorage.$default({
      currentTask: null,
      tasks: [],
      backlogTasks: []
    });

    this.updateElectronStorage = () => {
      if (Config) {
        config.set('ls', $localStorage);
      }
    };

    this.getCurrent = () => {
      return $q.when($localStorage.currentTask);
    };

    this.getBacklog = () => {
      return $q.when($localStorage.backlogTasks);
    };

    this.getToday = () => {
      return $q.when($localStorage.tasks);
    };

    this.updateCurrent = (task) => {
      $localStorage.currentTask = task;
    };

    this.updateToday = (tasks) => {
      $localStorage.tasks = tasks;
    };

    this.updateBacklog = (tasks) => {
      $localStorage.backlogTasks = tasks;
    };

    // AngularJS will instantiate a singleton by calling "new" on this function
  }

})();

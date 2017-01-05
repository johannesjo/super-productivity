/**
 * @ngdoc function
 * @name superProductivity.controller:SettingsCtrl
 * @description
 * # SettingsCtrl
 * Controller of the superProductivity
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('SettingsCtrl', SettingsCtrl);

  /* @ngInject */
  function SettingsCtrl($localStorage, $rootScope) {
    let vm = this;

    vm.importSettings = (uploadSettingsTextarea) => {
      let settings = JSON.parse(uploadSettingsTextarea);
      console.log(settings);
      $rootScope.r.currentTask = $localStorage.currentTask = settings.currentTask;
      $rootScope.r.tasks = $localStorage.tasks = settings.tasks;
      $rootScope.r.backlogTasks = $localStorage.backlogTasks = settings.backlogTasks;
    };

    vm.jiraSettings = angular.copy($rootScope.r.jiraSettings);


    vm.saveJiraSettings = (settings) => {
      $rootScope.r.jiraSettings = $localStorage.jiraSettings = settings;
    };
  }
})();

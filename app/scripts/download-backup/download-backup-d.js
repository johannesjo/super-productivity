/**
 * @ngdoc directive
 * @name superProductivity.directive:downloadBackup
 * @description
 * # downloadBackup
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('downloadBackup', downloadBackup);

  /* @ngInject */
  function downloadBackup($localStorage) {
    return {
      bindToController: true,
      controllerAs: 'vm',
      link: linkFn,
      restrict: 'A'
    };

    function linkFn(scope, element) {
      element.on('click', () => {
        let storageObj = {
          currentTask: $localStorage.currentTask,
          tasks: $localStorage.tasks,
          backlogTasks: $localStorage.backlogTasks,
          doneTasks: $localStorage.doneTasks,
          distractions: $localStorage.distractions,
          jiraSettings: $localStorage.jiraSettings,
          noteForToday: $localStorage.noteForToday,
          theme: $localStorage.theme,
        };

        let dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(storageObj));

        element[0].setAttribute('href', dataStr);
        element[0].setAttribute('download', 'super-productivity-backup.json');
      });
    }
  }
})();

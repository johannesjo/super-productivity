/**
 * @ngdoc function
 * @name superProductivity.controller:TimeSheetExportCtrl
 * @description
 * # TimeSheetExportCtrl
 * Controller of the superProductivity
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .controller('TimeSheetExportCtrl', TimeSheetExportCtrl);

  /* @ngInject */
  function TimeSheetExportCtrl($mdDialog, tasks, settings, TasksUtil, $scope, ParseDuration, SimpleToast, theme, GoogleApi, $rootScope, Tasks) {
    let vm = this;
    vm.theme = theme;
    vm.opts = $rootScope.r.uiHelper.timeSheetExportSettings;
    vm.actualValues = [];

    console.log(vm.opts.defaultValues);

    vm.roundTimeOptions = [
      { id: 'QUARTER', title: 'full quarters' },
      { id: 'HALF', title: 'full half hours' },
      { id: 'HOUR', title: 'full hours' },
    ];

    vm.submit = () => {
      $mdDialog.hide();
    };

    vm.cancel = () => {
      $mdDialog.hide();
    };

    vm.login = () => {
      GoogleApi.login()
        .then(() => {
          vm.isLoggedIn = true;
        });
    };

    vm.readSpreadsheet = () => {
      vm.headings = undefined;
      GoogleApi.getSpreadsheetHeadings(vm.opts.spreadsheetId)
        .then((headings) => {
          vm.headings = headings;
          vm.updateDefaults();
        })
    };

    vm.logout = () => {
      GoogleApi.logout()
        .then(() => {
          vm.isLoggedIn = false;
        });
    };

    vm.updateDefaults = () => {
      vm.opts.defaultValues.forEach((val, index) => {
        vm.actualValues[index] = replaceVals(val);
      });
    };

    function replaceVals(defaultVal) {
      const dVal = defaultVal.trim();
      switch (dVal) {
        case '{startTime}':
          return getStartTime();
        case '{currentTime}':
          return getCurrentTime();
        case '{date}':
          return window.moment().format('DD/MM/YYYY');
        case '{taskTitles}':
          return getTaskTitles();
        case '{subTaskTitles}':
          return getSubTaskTitles();
        case '{totalTime}':
          return getTotalTime();
        default:
          return dVal;
      }
    }

    function getStartTime() {
      return $rootScope.r.startedTimeToday.format('H:mm');
    }

    function getCurrentTime() {
      const currentTIme = window.moment().format('H:mm');
      return currentTIme;
    }

    function getTotalTime() {
      const timeWorked = Tasks.getTimeWorkedToday();
      return timeWorked.format('H:mm');
    }

    function getTaskTitles() {
      const tasks = Tasks.getToday();
      let titleStr = '';
      tasks.forEach((task) => {
        titleStr += task.title + ', '
      });
      return titleStr.substring(0, titleStr.length - 2);
    }

    function getSubTaskTitles() {
      const tasks = Tasks.getToday();
      let titleStr = '';
      tasks.forEach((task) => {
        console.log(task);

        if (task.subTasks) {
          task.subTasks.forEach((subTask) => {
            titleStr += subTask.title + ', ';
          });
        } else {
          titleStr += task.title + ', ';
        }
      });
      return titleStr.substring(0, titleStr.length - 2);
    }

    if (vm.opts.isAutoLogin) {
      GoogleApi.login()
        .then(() => {
          if (vm.opts.spreadsheetId) {
            return GoogleApi.getSpreadsheetHeadings(vm.opts.spreadsheetId);
          }
        })
        .then((headings) => {
          vm.isLoggedIn = true;
          console.log(headings);
          vm.headings = headings;
          vm.updateDefaults();
        });
    }
  }
})();

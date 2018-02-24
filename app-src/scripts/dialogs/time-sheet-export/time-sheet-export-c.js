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

    vm.roundTimeOptions = [
      { id: 'QUARTER', title: 'full quarters' },
      { id: 'HALF', title: 'full half hours' },
      { id: 'HOUR', title: 'full hours' },
    ];

    vm.cancel = () => {
      $mdDialog.hide();
    };

    vm.login = () => {
      return GoogleApi.login()
        .then(() => {
          vm.isLoggedIn = true;
        });
    };

    vm.readSpreadsheet = () => {
      vm.headings = undefined;
      return GoogleApi.getSpreadsheetHeadingsAndLastRow(vm.opts.spreadsheetId)
        .then((data) => {
          vm.headings = data.headings;
          vm.lastRow = data.lastRow;
          vm.updateDefaults();
        })
    };

    vm.logout = () => {
      GoogleApi.logout()
        .then(() => {
          vm.isLoggedIn = false;
        });
    };

    vm.save = () => {
      const arraysEqual = (arr1, arr2) => {
        if (arr1.length !== arr2.length)
          return false;
        for (let i = arr1.length; i--;) {
          if (arr1[i] !== arr2[i])
            return false;
        }
        return true;
      };

      if (arraysEqual(vm.actualValues, vm.lastRow)) {
        SimpleToast('CUSTOM', 'Current values and the last saved row have equal values, that is probably not what you want.');
      } else {
        GoogleApi.appendRow(vm.opts.spreadsheetId, vm.actualValues)
          .then(() => {
            SimpleToast('SUCCESS', 'Row successfully appended');
            $mdDialog.hide();
          });
      }
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
      return $rootScope.r.startedTimeToday.format('HH:mm');
    }

    function getCurrentTime() {
      const currentTIme = window.moment().format('HH:mm');
      return currentTIme;
    }

    function getTotalTime() {
      const timeWorked = Tasks.getTimeWorkedToday();
      return timeWorked.format('HH:mm');
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
      vm.login()
        .then(() => {
          if (vm.opts.spreadsheetId) {
            vm.readSpreadsheet();
          }
        })
        .then(() => {
          vm.updateDefaults();
        });
    }
  }
})();

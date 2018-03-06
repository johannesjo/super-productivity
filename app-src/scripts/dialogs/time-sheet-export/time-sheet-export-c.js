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
      vm.isLoading = true;
      return GoogleApi.login()
        .then(() => {
          vm.isLoggedIn = true;
          vm.isLoading = false;
        });
    };

    vm.readSpreadsheet = () => {
      vm.isLoading = true;
      vm.headings = undefined;
      return GoogleApi.getSpreadsheetHeadingsAndLastRow(vm.opts.spreadsheetId)
        .then((data) => {
          vm.headings = data.headings;
          vm.lastRow = data.lastRow;
          vm.updateDefaults();
          vm.isLoading = false;
        });
    };

    vm.logout = () => {
      vm.isLoading = true;
      GoogleApi.logout()
        .then(() => {
          vm.isLoggedIn = false;
          vm.isLoading = false;
        });
    };

    vm.save = () => {
      vm.isLoading = true;
      const arraysEqual = (arr1, arr2) => {
        if (arr1.length !== arr2.length) {
          return false;
        }
        for (let i = arr1.length; i--;) {
          if (arr1[i] !== arr2[i]) {
            return false;
          }
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
            vm.isLoading = false;
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
          return window.moment().format('MM/DD/YYYY');
        case '{taskTitles}':
          return getTaskTitles();
        case '{subTaskTitles}':
          return getSubTaskTitles();
        case '{totalTime}':
          return getTotalTimeWorked();
        default:
          return dVal;
      }
    }

    function roundTime(value, roundTo, isRoundUp) {
      let rounded;

      switch (roundTo) {
        case 'QUARTER':
          rounded = Math.round(value.minute() / 15) * 15;
          if (isRoundUp) {
            rounded = Math.ceil(value.minute() / 15) * 15;
          }
          return value.minute(rounded).second(0);

        case 'HALF':
          rounded = Math.round(value.minute() / 30) * 30;
          if (isRoundUp) {
            rounded = Math.ceil(value.minute() / 30) * 30;
          }
          return value.minute(rounded).second(0);

        case 'HOUR':
          rounded = Math.round(value.minute() / 60) * 60;
          if (isRoundUp) {
            rounded = Math.ceil(value.minute() / 60) * 60;
          }
          return value.minute(rounded).second(0);

        default:
          return value;
      }
    }

    function getStartTime() {
      const val = $rootScope.r.startedTimeToday;
      const roundTo = vm.opts.roundStartTimeTo;
      return roundTime(val, roundTo)
        .format('HH:mm');
    }

    function getCurrentTime() {
      const val = window.moment();
      const roundTo = vm.opts.roundEndTimeTo;

      return roundTime(val, roundTo)
        .format('HH:mm');
    }

    function getTotalTimeWorked() {
      let val = Tasks.getTimeWorkedToday();
      // convert to moment time
      val = window.moment().hours(val.asHours()).minutes(val.asMinutes());
      const roundTo = vm.opts.roundWorkTimeTo;
      return roundTime(val, roundTo, vm.opts.isRoundWorkTimeUp)
        .format('HH:mm');
    }

    function getTaskTitles() {
      const tasks = Tasks.getToday();
      let titleStr = '';
      tasks.forEach((task) => {
        titleStr += task.title + ', ';
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

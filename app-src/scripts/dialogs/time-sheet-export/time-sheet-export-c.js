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
  function TimeSheetExportCtrl($mdDialog, tasks, settings, TasksUtil, $scope, ParseDuration, SimpleToast, theme, GoogleApi, $rootScope, AppStorage) {
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
          return 'BLA_START';
        case '{currentTime}':
          return 'BLA_START1';
        case '{date}':
          return 'BLA_START2';
        case '{taskTitles}':
          return 'BLA_START3';
        case '{subTaskTitles}':
          return 'BLA_START4';
        case '{totalTime}':
          return 'BLA_START5';
        default:
          return dVal;
      }
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
        });
    }
  }
})();

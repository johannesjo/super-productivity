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
  function TimeSheetExportCtrl($mdDialog, tasks, settings, TasksUtil, $scope, ParseDuration, SimpleToast, theme, GoogleApi) {
    let vm = this;
    vm.theme = theme;

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
      GoogleApi.getSpreadsheetHeadings()
        .then((headings) => {
          vm.headings = headings;
        })
    };

    vm.logout = () => {
      GoogleApi.logout()
        .then(() => {
          vm.isLoggedIn = false;
        });
    };

    //if (true) {
    //  GoogleApi.login()
    //    .then(GoogleApi.getSpreadsheetHeadings.bind(GoogleApi))
    //    .then((headings) => {
    //      vm.isLoggedIn = true;
    //      console.log(headings);
    //      vm.headings = headings;
    //    });
    //}
  }
})();

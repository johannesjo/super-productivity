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

    vm.roundOptions = [
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

    GoogleApi.login()
      .then(GoogleApi.getSpreadsheetHeadings.bind(GoogleApi))
      .then((headings) => {
        vm.isLoggedIn = true;
        console.log(headings);
        vm.headings = headings;
      });
  }
})();

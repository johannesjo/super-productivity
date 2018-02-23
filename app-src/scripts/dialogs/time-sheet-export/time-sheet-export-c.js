/**
 * @ngdoc function
 * @name superProductivity.controller:TimeSheetExportCtrl
 * @description
 * # TimeSheetExportCtrl
 * Controller of the superProductivity
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('TimeSheetExportCtrl', TimeSheetExportCtrl);

  /* @ngInject */
  function TimeSheetExportCtrl($mdDialog, tasks, settings, TasksUtil, $scope, ParseDuration, SimpleToast, theme) {
    let vm = this;
    vm.theme = theme;


    vm.submit = () => {
      $mdDialog.hide();
    };

    vm.cancel = () => {
      $mdDialog.hide();
    };
  }
})();

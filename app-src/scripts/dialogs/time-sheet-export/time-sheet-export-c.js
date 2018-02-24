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
  function TimeSheetExportCtrl($mdDialog, tasks, settings, TasksUtil, $scope, ParseDuration, SimpleToast, theme, GAuth, GApi, GData, $state, $rootScope, GOOGLE) {
    let vm = this;
    vm.theme = theme;

    vm.submit = () => {
      $mdDialog.hide();
    };

    vm.cancel = () => {
      $mdDialog.hide();
    };


    const SPREADSHEET_ID = '1l8SN-qcjhsCPZe7jn6U5N4NXyeVQVIT72ZS32QYllWM';

    $rootScope.gdata = GData;
    const CLIENT = GOOGLE.CLIENT_ID;
    GApi.load('spreadsheet', 'v4');

    GAuth.setClient(CLIENT);
    GAuth.setScope('' +
      'https://www.googleapis.com/auth/spreadsheets.readonly ' +
      'https://www.googleapis.com/auth/spreadsheets.readonly'
    );

    // load the auth api so that it doesn't have to be loaded asynchronously
    // when the user clicks the 'login' button.
    // That would lead to popup blockers blocking the auth window
    GAuth.load();

    GAuth.login().then(function(user) {
      console.log(user.name + ' is logged in');
    }, function() {
      console.log('login failed');
    });

  }
})();

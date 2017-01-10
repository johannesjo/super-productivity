/**
 * @ngdoc function
 * @name superProductivity.controller:CreateProjectCtrl
 * @description
 * # CreateProjectCtrl
 * Controller of the superProductivity
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('CreateProjectCtrl', CreateProjectCtrl);

  /* @ngInject */
  function CreateProjectCtrl($mdDialog, Tasks) {
    let vm = this;
    vm.task = {};

    vm.createProject = () => {
      let success = Tasks.addToday(vm.task);

      if (success) {
        $mdDialog.hide();
      }
    };

    vm.cancel = () => {
      $mdDialog.hide();
    };
  }
})();

/**
 * @ngdoc function
 * @name superProductivity.controller:TaskSelectionCtrl
 * @description
 * # TaskSelectionCtrl
 * Controller of the superProductivity
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .controller('TaskSelectionCtrl', TaskSelectionCtrl);

  /* @ngInject */
  function TaskSelectionCtrl($mdDialog, Tasks, theme, $filter) {
    let vm = this;
    vm.theme = theme;

    vm.undoneTasks = Tasks.getUndoneToday(true);

    vm.submit = () => {
      if (!vm.selectedTask) {
        vm.selectedTask = vm.undoneTasks[0];
      }
      Tasks.updateCurrent(vm.selectedTask);
      $mdDialog.hide();
    };

    vm.getFilteredUndoneTasks = (searchText) => {
      return searchText ? $filter('filter')(vm.undoneTasks, searchText, false) : vm.undoneTasks;
    };
  }
})();

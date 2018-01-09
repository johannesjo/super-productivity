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

    if (!vm.undoneTasks || vm.undoneTasks.length === 0) {
      vm.isShowTaskCreationForm = true;
      vm.newTask = {};
    }

    vm.submit = () => {
      if (vm.isShowTaskCreationForm) {
        vm.selectedTask = Tasks.addToday(vm.newTask);
      } else if (!vm.selectedTask) {
        vm.selectedTask = vm.undoneTasks[0];
      }

      Tasks.updateCurrent(vm.selectedTask);

      if (vm.selectedTask) {
        $mdDialog.hide(vm.selectedTask);
      } else {
        $mdDialog.cancel();
      }
    };

    vm.getFilteredUndoneTasks = (searchText) => {
      return searchText ? $filter('filter')(vm.undoneTasks, searchText, false) : vm.undoneTasks;
    };
  }
})();

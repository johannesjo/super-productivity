/**
 * @ngdoc directive
 * @name superProductivity.directive:workView
 * @description
 * # workView
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('workView', workView);

  /* @ngInject */
  function workView() {
    return {
      templateUrl: 'scripts/work-view/work-view-d.html',
      bindToController: true,
      controller: WorkViewCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: {}
    };
  }

  /* @ngInject */
  function WorkViewCtrl(Tasks, $rootScope, $scope, $state, Dialogs, Jira) {
    let vm = this;

    vm.r = $rootScope.r;

    function mergeDoneAndUndone() {
      // we need to re-merge because of splitting up the tasks into two
      if (vm.tasksUndone && vm.tasksDone) {
        let newTaskList = vm.tasksDone.concat(vm.tasksUndone);
        Tasks.updateToday(newTaskList);
      }
    }

    vm.openAddTask = () => {
      Dialogs('ADD_TASK');
    };

    vm.onItemMovedUndone = () => {
      // mark all items in list to done
      for (let i = 0; i < vm.tasksDone.length; i++) {
        let task = vm.tasksDone[i];
        task.isDone = true;
      }

    };
    vm.onItemMovedDone = () => {
      // mark all items in list to undone
      for (let i = 0; i < vm.tasksUndone.length; i++) {
        let task = vm.tasksUndone[i];
        task.isDone = false;
      }
    };

    $scope.$watch('vm.tasksDone', mergeDoneAndUndone, true);
    $scope.$watch('vm.tasksUndone', mergeDoneAndUndone, true);

    $scope.$watch('vm.r.tasks', () => {
      vm.tasksUndone = Tasks.getUndoneToday();
      vm.tasksDone = Tasks.getDoneToday();
    }, true);

    $scope.$watch('vm.r.currentTask', (mVal, oldVal) => {
      if (mVal && mVal.originalKey && (mVal !== oldVal) && (mVal.id !== (oldVal && oldVal.id))) {
        // TODO this should be somewhere else
        // check if jira support is available
        if (window.isElectron) {
          Jira.updateStatus(mVal);
        }
      }

      if (mVal && mVal.isDone) {
        let undoneTasks = Tasks.getUndoneToday();

        // go to daily planner if there are no undone tasks left
        if (!undoneTasks || undoneTasks.length === 0) {
          $state.go('daily-planner');
        } else {
          Tasks.updateCurrent(undoneTasks[0]);
        }
      }
    }, true);

    // watch for total time spent today
    $scope.$watch('vm.r.tasks', () => {
      vm.totalTimeWorkedToday = Tasks.getTimeWorkedToday();
    }, true);

  }

})();

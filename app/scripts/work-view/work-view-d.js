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
      scope: true
    };
  }

  /* @ngInject */
  function WorkViewCtrl(Tasks, $window, $rootScope, $scope, Dialogs, $localStorage) {
    let vm = this;

    // PRIVATE FUNCTIONS
    // -----------------
    function updateGlobalTaskModel() {
      // we need to re-merge because of splitting up the tasks into two
      if (vm.tasksUndone && vm.tasksDone) {
        let newTaskList = vm.tasksDone.concat(vm.tasksUndone);
        Tasks.updateToday(newTaskList);
      }
    }

    function updateTasksLsOnly() {
      if (vm.tasksUndone && vm.tasksDone) {
        $localStorage.tasks = vm.tasksDone.concat(vm.tasksUndone);
      }
    }

    function updateTimeTotals() {
      vm.totalTimeWorkedToday = Tasks.getTimeWorkedToday();
      vm.totalEstimationRemaining = Tasks.calcRemainingTime(vm.tasksUndone);
    }

    // DIRECTIVE METHODS
    // -----------------
    vm.openAddTask = () => {
      Dialogs('ADD_TASK');
    };

    vm.onTaskDoneChangedUndoneList = (task) => {
      if (task.isDone) {
        const taskIndex = $window._.findIndex(vm.tasksUndone, function (taskInArray) {
          return taskInArray.id === task.id;
        });
        // add to the end of the done task list
        vm.tasksDone.push(task);
        // remove from undone task list
        vm.tasksUndone.splice(taskIndex, 1);
      }
    };

    vm.onTaskDoneChangedDoneList = (task) => {
      if (!task.isDone) {
        const taskIndex = $window._.findIndex(vm.tasksDone, function (taskInArray) {
          return taskInArray.id === task.id;
        });
        // add to the start of the undone task list
        vm.tasksUndone.unshift(task);
        // remove from done task list
        vm.tasksDone.splice(taskIndex, 1);
      }
    };

    vm.onItemMovedUndone = (currentlyMovedTask, parentTask) => {
      console.log('MOVE_UN_DONE', currentlyMovedTask, parentTask);

      if (!parentTask) {
        currentlyMovedTask.isDone = true;
      } else {
        currentlyMovedTask.isDone = parentTask.isDone;
      }
    };

    vm.onItemMovedDone = (currentlyMovedTask, parentTask) => {
      console.log('MOVE_DONE', currentlyMovedTask, parentTask);

      if (!parentTask) {
        currentlyMovedTask.isDone = false;
      } else {
        currentlyMovedTask.isDone = parentTask.isDone;
      }
    };

    // WATCHER & EVENTS
    // ----------------
    $rootScope.$watch('r.tasks', updateTimeTotals, true);

    // we wan't to save to the LS in case the app crashes
    $scope.$watch('vm.tasksDone', updateTasksLsOnly, true);
    $scope.$watch('vm.tasksUndone', updateTasksLsOnly, true);

    // otherwise we update on view change
    $scope.$on('$destroy', () => {
      updateGlobalTaskModel();
    });

    // update initially or when the global tasks array changes for some outside reason
    $rootScope.$watch('r.tasks', () => {
      vm.tasksUndone = Tasks.getUndoneToday();
      vm.tasksDone = Tasks.getDoneToday();
    });

  }

})();

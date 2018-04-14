/**
 * @ngdoc directive
 * @name superProductivity.directive:workView
 * @description
 * # workView
 */

(function() {
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
  function WorkViewCtrl(Tasks, $window, $scope, Dialogs, $rootScope, TasksUtil, $timeout, EV) {
    let vm = this;
    const _ = $window._;

    // INIT
    function init() {
      vm.session = $rootScope.r.currentSession;
      vm.config = $rootScope.r.config;
      vm.tasksUndone = Tasks.getUndoneToday();
      vm.tasksDone = Tasks.getDoneToday();
      updateTimeTotals();
      focusFirstTask();
    }

    init();

    // PRIVATE FUNCTIONS
    // -----------------
    function focusFirstTask() {
      $timeout(() => {
        const allTasks = document.querySelectorAll('.task');
        if (allTasks && allTasks[0]) {
          allTasks[0].focus();
        }
      });
    }

    function updateGlobalTaskModel() {
      // we need to re-merge because of splitting up the tasks into two
      if (vm.tasksUndone && vm.tasksDone) {
        let newTaskList = vm.tasksDone.concat(vm.tasksUndone);
        Tasks.updateToday(newTaskList);
      }
    }

    function updateTasksLsOnly() {
      if (vm.tasksUndone && vm.tasksDone) {
        $rootScope.r.tasks = vm.tasksDone.concat(vm.tasksUndone);
      }
    }

    function updateTimeTotals() {
      vm.totalTimeWorkedToday = Tasks.getTimeWorkedToday();
      vm.totalEstimationRemaining = TasksUtil.calcRemainingTime(vm.tasksUndone);
    }

    // DIRECTIVE METHODS
    // -----------------
    vm.openAddTask = () => {
      Dialogs('ADD_TASK', undefined, true);
    };

    vm.collapseAllNotesAndSubTasks = () => {
      Tasks.collapseNotes(vm.tasksDone);
      Tasks.collapseNotes(vm.tasksUndone);

      Tasks.collapseSubTasks(vm.tasksDone);
      Tasks.collapseSubTasks(vm.tasksUndone);
    };

    vm.onTaskDoneChangedUndoneList = (task) => {
      if (task.isDone) {
        const taskIndex = _.findIndex(vm.tasksUndone, function(taskInArray) {
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
        const taskIndex = _.findIndex(vm.tasksDone, function(taskInArray) {
          return taskInArray.id === task.id;
        });
        // add to the start of the undone task list
        vm.tasksUndone.unshift(task);
        // remove from done task list
        vm.tasksDone.splice(taskIndex, 1);
      }
    };

    // WATCHER & EVENTS
    // ----------------
    const watchers = [];
    watchers.push($scope.$watch('r.tasks', (newTasks, oldTasks) => {
      updateTimeTotals();

      // update when the global tasks array changes for some outside reason (e.g. task is added)
      if (newTasks && (newTasks.length !== (oldTasks && oldTasks.length))) {
        vm.tasksUndone = Tasks.getUndoneToday();
        vm.tasksDone = Tasks.getDoneToday();
      }
    }, true));

    watchers.push($scope.$watchCollection('vm.tasksDone', () => {
      _.each(vm.tasksDone, (task) => {
        task.isDone = true;
      });
      // we wan't to save to the LS in case the app crashes
      updateTasksLsOnly();
    }));
    watchers.push($scope.$watchCollection('vm.tasksUndone', () => {
      _.each(vm.tasksUndone, (task) => {
        task.isDone = false;
      });
      // we wan't to save to the LS in case the app crashes
      updateTasksLsOnly();
    }));

    $scope.$on(EV.PROJECT_CHANGED, () => {
      init();
    });

    // otherwise we update on view change
    $scope.$on('$destroy', () => {
      updateGlobalTaskModel();

      // remove watchers manually
      _.each(watchers, (watcher) => {
        watcher();
      });
    });

  }

})();

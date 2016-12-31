/**
 * @ngdoc directive
 * @name superProductivity.directive:dailyPlanner
 * @description
 * # dailyPlanner
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .directive('dailyPlanner', dailyPlanner);

  /* @ngInject */
  function dailyPlanner() {
    return {
      templateUrl: 'scripts/daily-planner/daily-planner-d.html',
      bindToController: true,
      controller: DailyPlannerCtrl,
      controllerAs: 'vm',
      link: linkFn,
      restrict: 'E',
      scope: {}
    };

    function linkFn(scope, element, attrs) {

    }
  }

  /* @ngInject */
  function DailyPlannerCtrl($localStorage, Dialogs, $state) {
    let vm = this;

    $localStorage.$default({
      tasks: [],
      backlogTasks: []
    });

    vm.limitBacklogTo = 3;
    vm.tasks = $localStorage.tasks;
    vm.backlogTasks = $localStorage.backlogTasks;

    vm.listModel = {
      selected: null,
      lists: {
        today: vm.tasks,
        backlog: vm.backlogTasks
      }
    };

    vm.addTask = () => {
      vm.tasks.push({
        title: vm.newTask,
        id: Math.random().toString(36).substr(2, 10)
      });

      vm.newTask = '';
    };

    vm.estimateTime = (task) => {
      Dialogs('TIME_ESTIMATE', {task});

    };

    vm.done = () => {
      Dialogs('TASK_SELECTION', {tasks: vm.tasks})
        .then(() => {
          $state.go('work-view');
        });
    };
  }

})();

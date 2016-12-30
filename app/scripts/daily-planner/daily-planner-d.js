/**
 * @ngdoc directive
 * @name superProductivity.directive:dailyPlanner
 * @description
 * # dailyPlanner
 */

(function () {
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
  function DailyPlannerCtrl($localStorage, $scope) {
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

    $scope.models = {
      selected: null,
      lists: { "A": [], "B": [] }
    };

    // Generate initial model
    for (var i = 1; i <= 3; ++i) {
      $scope.models.lists.A.push({ label: "Item A" + i });
      $scope.models.lists.B.push({ label: "Item B" + i });
    }

    vm.addTask = function () {
      vm.tasks.push({
        title: vm.newTask,
        id: Math.random().toString(36).substr(2, 10)
      });
      console.log('I am here!', vm.tasks);

      vm.newTask = '';
    };
  }

})();

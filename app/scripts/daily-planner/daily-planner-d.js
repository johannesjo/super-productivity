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
        scope: {

        }
      };

    function linkFn(scope, element, attrs) {

    }
  }

  /* @ngInject */
  function DailyPlannerCtrl() {
    var vm = this;
  }

})();

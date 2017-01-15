/**
 * @ngdoc directive
 * @name superProductivity.directive:dailyAgenda
 * @description
 * # dailyAgenda
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('dailyAgenda', dailyAgenda);

  /* @ngInject */
  function dailyAgenda() {
    return {
      templateUrl: 'scripts/daily-agenda/daily-agenda-d.html',
      bindToController: true,
      controller: DailyAgendaCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: true
    };

  }

  /* @ngInject */
  function DailyAgendaCtrl() {
    let vm = this;
  }

})();

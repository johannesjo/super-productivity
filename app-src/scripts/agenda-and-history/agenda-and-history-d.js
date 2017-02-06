/**
 * @ngdoc directive
 * @name superProductivity.directive:agendaAndHistory
 * @description
 * # agendaAndHistory
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('agendaAndHistory', agendaAndHistory);

  /* @ngInject */
  function agendaAndHistory() {
    return {
      templateUrl: 'scripts/agenda-and-history/agenda-and-history-d.html',
      bindToController: true,
      controller: AgendaAndHistoryCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: true
    };
  }

  /* @ngInject */
  function AgendaAndHistoryCtrl() {
    //let vm = this;
  }

})();

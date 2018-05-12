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
      template: require('./agenda-and-history-d.html'),
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

/**
 * @ngdoc function
 * @name superProductivity.controller:JiraAssignTicketCtrl
 * @description
 * # JiraAssignTicketCtrl
 * Controller of the superProductivity
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('JiraAssignTicketCtrl', JiraAssignTicketCtrl);

  /* @ngInject */
  function JiraAssignTicketCtrl($mdDialog, task, theme, Jira) {
    let vm = this;

    vm.theme = theme;
    vm.task = task;

    vm.assignTicket = () => {
      $mdDialog.hide();
    };

    vm.cancel = () => {
      $mdDialog.cancel();
    };
  }
})();

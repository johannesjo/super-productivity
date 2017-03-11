/**
 * @ngdoc function
 * @name superProductivity.controller:JiraSetStatusCtrl
 * @description
 * # JiraSetStatusCtrl
 * Controller of the superProductivity
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('JiraSetStatusCtrl', JiraSetStatusCtrl);

  /* @ngInject */
  function JiraSetStatusCtrl($mdDialog, task, transitions, localType, $window, $localStorage, theme) {
    let vm = this;
    vm.theme = theme;
    vm.transitions = transitions;
    vm.task = task;
    vm.localType = localType;

    vm.chosenTransitionIndex = $window._.findIndex(vm.transitions, (transition) => {
      return transition.name === (vm.task.originalStatus && vm.task.originalStatus.name);
    });

    vm.updateTask = (chosenTransitionIndex) => {
      let transition = vm.transitions[chosenTransitionIndex];

      if (vm.saveAsDefaultAction) {
        if (!$localStorage.jiraSettings.transitions) {
          $localStorage.jiraSettings.transitions = {};
        }
        $localStorage.jiraSettings.transitions[localType] = transition.id;
        $localStorage.jiraSettings.allTransitions = transitions;
      }

      $mdDialog.hide(transition);
    };

    vm.cancel = () => {
      $mdDialog.cancel();
    };
  }
})();

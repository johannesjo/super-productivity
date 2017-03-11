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
  function JiraSetStatusCtrl($mdDialog, task, transitions, localType, $window, $localStorage, theme, Jira) {
    let vm = this;
    vm.theme = theme;
    vm.transitions = transitions;
    vm.task = task;
    vm.localType = localType;

    vm.chosenTransitionIndex = $window._.findIndex(vm.transitions, (transition) => {
      return transition.name === (vm.task.originalStatus && vm.task.originalStatus.name);
    });

    vm.userQuery = (searchText) => {
      return Jira.searchUsers(searchText)
        .then((res) => {
          const userKeys = [];
          _.each(res.response, user => userKeys.push(user.key));
          return userKeys;
        });
    };

    vm.updateTask = (chosenTransitionIndex) => {
      let transition = vm.transitions[chosenTransitionIndex];

      if (vm.saveAsDefaultAction) {
        if (!$localStorage.jiraSettings.transitions) {
          $localStorage.jiraSettings.transitions = {};
        }
        $localStorage.jiraSettings.transitions[localType] = transition.id;
        $localStorage.jiraSettings.allTransitions = transitions;
      }
      console.log(vm.userToAssign);

      if (vm.userToAssign) {
        Jira.updateAssignee(task, vm.userToAssign)
          .then($mdDialog.hide);
        $mdDialog.hide();
      } else {
        $mdDialog.hide(transition);
      }
    };

    vm.cancel = () => {
      $mdDialog.cancel();
    };
  }
})();

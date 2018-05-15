/**
 * @ngdoc function
 * @name superProductivity.controller:JiraSetStatusCtrl
 * @description
 * # JiraSetStatusCtrl
 * Controller of the superProductivity
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .controller('JiraSetStatusCtrl', JiraSetStatusCtrl);

  /* @ngInject */
  function JiraSetStatusCtrl($mdDialog, task, transitions, localType, $window, $rootScope, theme, Jira) {
    let vm = this;
    vm.theme = theme;
    vm.transitions = transitions;

    vm.transitions.push({
      id: 'DO_NOT',
      name: 'Don`t transition'
    });

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
        if (!$rootScope.r.jiraSettings.transitions) {
          $rootScope.r.jiraSettings.transitions = {};
        }
        $rootScope.r.jiraSettings.transitions[localType] = transition.id;
        $rootScope.r.jiraSettings.allTransitions = transitions;
      }

      if (vm.userToAssign) {
        Jira.updateAssignee(task, vm.userToAssign)
          .then(() => {
            if (!transition || transition.id === 'DO_NOT') {
              $mdDialog.cancel();
            } else {
              $mdDialog.hide(transition);
            }
          });
      } else {
        if (!transition || transition.id === 'DO_NOT') {
          $mdDialog.cancel();
        } else {
          $mdDialog.hide(transition);
        }
      }
    };

    vm.cancel = () => {
      $mdDialog.cancel();
    };
  }
})();

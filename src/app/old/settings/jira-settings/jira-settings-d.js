/**
 * @ngdoc directive
 * @name superProductivity.directive:jiraSettings
 * @description
 * # jiraSettings
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .directive('jiraSettings', jiraSettings);

  /* @ngInject */
  function jiraSettings() {
    return {
      templateUrl: 'scripts/settings/jira-settings/jira-settings-d.html',
      bindToController: true,
      controller: JiraSettingsCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: {
        settings: '='
      }
    };
  }

  /* @ngInject */
  function JiraSettingsCtrl(Jira, SimpleToast, $timeout, $scope, IS_ELECTRON, IS_EXTENSION, $filter) {
    let vm = this;
    vm.IS_ELECTRON = IS_ELECTRON;
    vm.IS_EXTENSION = IS_EXTENSION;
    vm.hasJiraSupport = IS_ELECTRON || IS_EXTENSION;
    vm.taskSuggestions = [];

    if (Jira.isSufficientJiraSettings(vm.settings)) {
      Jira.getSuggestions().then((res) => {
        vm.taskSuggestions = vm.taskSuggestions.concat(Jira.transformIssues(res));
      });
    }

    vm.onTransitionExampleTaskSelected = (task) => {
      SimpleToast('SUCCESS', 'Jira Config: Example task selected!');
      Jira.getTransitionsForIssue(task)
        .then((response) => {
          vm.settings.allTransitions = response.response.transitions;
        });
    };

    vm.getFilteredTaskSuggestions = (searchText) => {
      return searchText ? $filter('filter')(vm.taskSuggestions, searchText, false, 'title') : vm.taskSuggestions;
    };

    vm.testJiraCredentials = () => {
      let errorMsgTimeout;

      if (Jira.isSufficientJiraSettings(vm.settings)) {
        Jira.getSuggestions().then((res) => {
            vm.taskSuggestions = vm.taskSuggestions.concat(Jira.transformIssues(res));
            SimpleToast('SUCCESS', 'Connection successful!');
          }, () => {
            // give other error time to display
            errorMsgTimeout = $timeout(() => {
              SimpleToast('ERROR', 'Connection timed out!');
            }, 3000);
          }
        );
      } else {
        SimpleToast('ERROR', 'Insuffcient settings!');
      }

      $scope.$on('$destroy', () => {
        if (errorMsgTimeout) {
          $timeout.cancel(errorMsgTimeout);
        }
      });
    };
  }

})();

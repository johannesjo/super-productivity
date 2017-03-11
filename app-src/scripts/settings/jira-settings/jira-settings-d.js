/**
 * @ngdoc directive
 * @name superProductivity.directive:jiraSettings
 * @description
 * # jiraSettings
 */

(function () {
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
  function JiraSettingsCtrl(Jira, SimpleToast, $timeout, $scope) {
    let vm = this;

    vm.testJiraCredentials = () => {
      let errorMsgTimeout;

      if (Jira.isSufficientJiraSettings(vm.settings)) {
        Jira.getSuggestions().then(() => {
            SimpleToast('SUCCESS', 'Connection successful!');
          }, () => {
            // give other error time to display
            errorMsgTimeout = $timeout(() => {
              SimpleToast('ERROR', 'Connection failed!');
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

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
  function JiraSettingsCtrl(Jira, SimpleToast) {
    let vm = this;

    vm.testJiraCredentials = () => {
      Jira.getSuggestions().then(() => {
        SimpleToast('SUCCESS', 'Connection successful!');
      });
    };
  }

})();

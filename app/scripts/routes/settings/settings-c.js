/**
 * @ngdoc function
 * @name superProductivity.controller:SettingsCtrl
 * @description
 * # SettingsCtrl
 * Controller of the superProductivity
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('SettingsCtrl', SettingsCtrl);

  /* @ngInject */
  function SettingsCtrl($localStorage, $rootScope, $scope) {
    let vm = this;

    vm.r = $rootScope.r;

    // import/export stuff
    vm.importSettings = (uploadSettingsTextarea) => {
      let settings = JSON.parse(uploadSettingsTextarea);

      angular.forEach(settings, (val, key) => {
        $rootScope.r[key] = $localStorage[key] = val;
      });
    };

    // jira stuff
    vm.jiraSettings = angular.copy($rootScope.r.jiraSettings);

    vm.saveJiraSettings = (settings) => {
      $rootScope.r.jiraSettings = $localStorage.jiraSettings = settings;
    };

    // theme stuff
    vm.themes = [
      'red',
      'pink',
      'purple',
      'deep-purple',
      'indigo',
      'blue',
      'light-blue',
      'cyan',
      'teal',
      'green',
      'light-green',
      'lime',
      'yellow',
      'amber',
      'orange',
      'deep-orange',
      'brown',
      'grey',
      'blue-grey'
    ];

    vm.isDarkTheme = $rootScope.r.theme && $rootScope.r.theme.indexOf('dark') > -1;

    $scope.$watch('vm.selectedTheme', function (value) {
      if (value) {
        if (vm.isDarkTheme) {
          $rootScope.r.theme = $localStorage.theme = value + '-dark';
        } else {
          $rootScope.r.theme = $localStorage.theme = value + '-theme';
        }
      }
    });

    $scope.$watch('vm.isDarkTheme', function (value) {
      if (value) {
        $rootScope.r.theme = $localStorage.theme = $rootScope.r.theme.replace('-theme', '-dark');
        $rootScope.r.bodyClass = 'dark-theme';
      } else {
        $rootScope.r.theme = $localStorage.theme = $rootScope.r.theme.replace('-dark', '-theme');
        $rootScope.r.bodyClass = '';
      }
    });
  }
})();

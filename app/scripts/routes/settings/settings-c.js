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
  function SettingsCtrl($localStorage, $rootScope, $scope, Projects, Dialogs, DEFAULT_THEME, $mdToast) {
    let vm = this;

    function init() {
      vm.r = $rootScope.r;
      vm.allProjects = Projects.getList();
      vm.jiraSettings = angular.copy($rootScope.r.jiraSettings);

      $rootScope.r.theme = $localStorage.theme || DEFAULT_THEME;
      vm.isDarkTheme = $rootScope.r.theme && $rootScope.r.theme.indexOf('dark') > -1;
      vm.selectedTheme = $rootScope.r.theme && $rootScope.r.theme
          .replace('-theme', '')
          .replace('-dark', '');
    }

    // save project stuff
    vm.createNewProjectFromCurrent = (projectTitle) => {
      Projects.createNewFromCurrent(projectTitle);

      $mdToast.show($mdToast.simple()
        .textContent('Project "' + projectTitle + '" successfully saved')
        .position('bottom'));
    };

    vm.createNewProject = () => {
      Dialogs('CREATE_PROJECT');
    };

    // import/export stuff
    vm.importSettings = (uploadSettingsTextarea) => {
      let settings = JSON.parse(uploadSettingsTextarea);

      angular.forEach(settings, (val, key) => {
        $rootScope.r[key] = $localStorage[key] = val;
      });

      $mdToast.show($mdToast.simple()
        .textContent('Settings successfully imported')
        .position('bottom'));
    };

    // jira stuff
    vm.saveJiraSettings = (settings) => {
      $rootScope.r.jiraSettings = $localStorage.jiraSettings = settings;
      // for some reason project needs to be updated directly
      if ($rootScope.r.currentProject && $rootScope.r.currentProject.data) {
        $rootScope.r.currentProject.data.jiraSettings = settings;
      }

      $mdToast.show($mdToast.simple()
        .textContent('Jira settigns saved')
        .position('bottom'));
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

    // update on global model changes
    $rootScope.$watch('r', () => {
      init();
    }, true);

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
      // for some reason project needs to be updated directly
      if ($rootScope.r.currentProject && $rootScope.r.currentProject.data) {
        $rootScope.r.currentProject.data.theme = $rootScope.r.theme;
      }
    });
  }
})();

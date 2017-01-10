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
  function SettingsCtrl($localStorage, $rootScope, $scope, Projects, Dialogs, DEFAULT_THEME, THEMES, IS_ELECTRON, SimpleToast, $mdDialog) {
    let vm = this;

    vm.IS_ELECTRON = IS_ELECTRON;

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

      SimpleToast('Project "' + projectTitle + '" successfully saved');
    };

    vm.createNewProject = () => {
      Dialogs('CREATE_PROJECT');
    };

    vm.deleteProject = (project, $index) => {
      if (project.id === $rootScope.r.currentProject.id) {
        SimpleToast('Cannot delete ' + project.title + ' as it is the current project!');
      } else {
        let confirm = $mdDialog.confirm()
          .title('Would you like to delete ' + project.title + '?')
          .textContent('All tasks and settings will be lost forever.')
          .ariaLabel('Delete Project')
          .ok('Please do it!')
          .cancel('Better not');

        $mdDialog.show(confirm).then(function () {
          vm.allProjects.splice($index, 1);
          SimpleToast(project.title + ' deleted!');
        });
      }
    };

    // import/export stuff
    vm.importSettings = (uploadSettingsTextarea) => {
      let settings = JSON.parse(uploadSettingsTextarea);

      angular.forEach(settings, (val, key) => {
        $rootScope.r[key] = $localStorage[key] = val;
      });

      // delete projects and current project if there are non yet
      if (!settings.currentProject) {
        $localStorage.currentProject = $rootScope.r.currentProject = undefined;
      }
      if (!settings.projects) {
        $localStorage.projects = $rootScope.r.projects = [];
      }

      SimpleToast('Settings successfully imported');
    };

    // jira stuff
    vm.saveJiraSettings = (settings) => {
      $rootScope.r.jiraSettings = $localStorage.jiraSettings = settings;
      // for some reason project needs to be updated directly
      if ($rootScope.r.currentProject && $rootScope.r.currentProject.data) {
        $rootScope.r.currentProject.data.jiraSettings = settings;
      }

      SimpleToast('Jira settigns saved');
    };

    // theme stuff
    vm.themes = THEMES;

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

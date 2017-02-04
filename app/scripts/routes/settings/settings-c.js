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
  function SettingsCtrl($localStorage, $window, $scope, Projects, DEFAULT_THEME, THEMES, IS_ELECTRON) {
    let vm = this;
    const _ = $window._;
    vm.IS_ELECTRON = IS_ELECTRON;

    function init() {
      vm.allProjects = Projects.getList();
      vm.selectedCurrentProject = $localStorage.currentProject;

      $localStorage.theme = $localStorage.theme || DEFAULT_THEME;
      vm.isDarkTheme = $localStorage.theme && $localStorage.theme.indexOf('dark') > -1;
      vm.selectedTheme = $localStorage.theme && $localStorage.theme
          .replace('-theme', '')
          .replace('-dark', '');
    }

    // theme stuff
    vm.themes = THEMES;

    // WATCHER & EVENTS
    // ----------------
    const watchers = [];

    // TODO that's kind of really bad
    // update on global model changes
    watchers.push($scope.$watch('r', () => {
      init();
    }, true));

    watchers.push($scope.$watch('vm.selectedTheme', function (value) {
      if (value) {
        if (vm.isDarkTheme) {
          $localStorage.theme = value + '-dark';
        } else {
          $localStorage.theme = value + '-theme';
        }
      }
    }));

    watchers.push($scope.$watch('vm.isDarkTheme', function (value) {
      if (value) {
        $localStorage.theme = $localStorage.theme.replace('-theme', '-dark');
        $localStorage.bodyClass = 'dark-theme';
      } else {
        $localStorage.theme = $localStorage.theme.replace('-dark', '-theme');
        $localStorage.bodyClass = '';
      }
      // for some reason project needs to be updated directly
      if ($localStorage.currentProject && $localStorage.currentProject.data) {
        $localStorage.currentProject.data.theme = $localStorage.theme;
      }
    }));

    // otherwise we update on view change
    $scope.$on('$destroy', () => {
      // remove watchers manually
      _.each(watchers, (watcher) => {
        watcher();
      });
    });
  }
})();

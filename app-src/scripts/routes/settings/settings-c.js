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
  function SettingsCtrl($rootScope, $window, $scope, Projects, IS_ELECTRON, EV) {
    let vm = this;
    const _ = $window._;
    vm.IS_ELECTRON = IS_ELECTRON;

    function init() {
      vm.allProjects = Projects.getList();
      vm.selectedCurrentProject = $rootScope.r.currentProject;
    }

    init();

    // WATCHER & EVENTS
    // ----------------
    const watchers = [];

    $scope.$on(EV.PROJECT_CHANGED, () => {
      init();
    });

    $scope.$on('$destroy', () => {
      // remove watchers manually
      _.each(watchers, (watcher) => {
        watcher();
      });
    });
  }
})();

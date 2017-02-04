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
  function SettingsCtrl($localStorage, $window, $scope, Projects, IS_ELECTRON) {
    let vm = this;
    const _ = $window._;
    vm.IS_ELECTRON = IS_ELECTRON;

    function init() {
      vm.allProjects = Projects.getList();
      vm.selectedCurrentProject = $localStorage.currentProject;
    }

    // WATCHER & EVENTS
    // ----------------
    const watchers = [];

    // TODO that's kind of really bad
    // update on global model changes
    watchers.push($scope.$watch('r', () => {
      init();
    }, true));

    $scope.$on('$destroy', () => {
      // remove watchers manually
      _.each(watchers, (watcher) => {
        watcher();
      });
    });
  }
})();

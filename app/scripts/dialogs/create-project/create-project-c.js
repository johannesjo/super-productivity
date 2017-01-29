/**
 * @ngdoc function
 * @name superProductivity.controller:CreateProjectCtrl
 * @description
 * # CreateProjectCtrl
 * Controller of the superProductivity
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('CreateProjectCtrl', CreateProjectCtrl);

  /* @ngInject */
  function CreateProjectCtrl($mdDialog, Projects, SimpleToast) {
    let vm = this;
    vm.task = {};

    vm.createProject = (project) => {
      Projects.createNew(project.title, {});
      SimpleToast('SUCCESS', 'You created the project "' + project.title + '"');
      $mdDialog.hide();
    };

    vm.cancel = () => {
      $mdDialog.hide();
    };
  }
})();

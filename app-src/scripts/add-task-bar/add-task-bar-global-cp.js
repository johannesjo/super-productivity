/**
 * @ngdoc component
 * @name superProductivity.component:addTaskBarGlobal
 * @description
 * # addTaskBarGlobal
 */

(() => {
  'use strict';

  class AddTaskBarGlobalCtrl {
    /* @ngInject */
    constructor(AddTaskBarGlobal, $element) {
      this.model = AddTaskBarGlobal.model;
      AddTaskBarGlobal.setFocusEl($element);
    }
  }

  angular
    .module('superProductivity')
    .component('addTaskBarGlobal', {
      templateUrl: 'scripts/add-task-bar/add-task-bar-global-cp.html',
      controller: AddTaskBarGlobalCtrl,
      controllerAs: 'vm',
      bindToController: {},
    });

  // hacky fix for ff
  AddTaskBarGlobalCtrl.$$ngIsClass = true;
})();

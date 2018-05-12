/**
 * @ngdoc component
 * @name superProductivity.component:addTaskBarGlobal
 * @description
 * # addTaskBarGlobal
 */

(() => {
  'use strict';

  class AddTaskBarGlobalCtrl {
    /* WEEEEIRD it is not needed here @ng?????Inject */
    constructor(AddTaskBarGlobal, $element) {
      this.model = AddTaskBarGlobal.model;
      AddTaskBarGlobal.setFocusEl($element);
    }
  }

  angular
    .module('superProductivity')
    .component('addTaskBarGlobal', {
      template: require('./add-task-bar-global-cp.html'),
      controller: AddTaskBarGlobalCtrl,
      controllerAs: 'vm',
      bindToController: {},
    });

  // hacky fix for ff
  AddTaskBarGlobalCtrl.$$ngIsClass = true;
})();

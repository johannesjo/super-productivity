/**
 * @ngdoc service
 * @name superProductivity.AddTaskBarGlobal
 * @description
 * # AddTaskBarGlobal
 * Service in the superProductivity.
 */

(() => {
  'use strict';

  class AddTaskBarGlobal {
    /* @ngInject */
    constructor(Git, Jira, $rootScope) {
      this.model = {};
      this.Git = Git;
      this.Jira = Jira;
      this.$rootScope = $rootScope;
    }

    setFocusEl(el) {
      this.focuesEl = el;
    }

    show(isShowFromBottom) {
      this.model.isShowFromBottom = isShowFromBottom;
      this.model.isShow = !this.model.isShow;
      //this.model.isShow = true;
      if (this.focuesEl) {
        setTimeout(() => {
          this.focuesEl.find('input').focus();
        });
      }
    }

    hide() {
      this.model.isShow = false;
    }
  }

  angular
    .module('superProductivity')
    .service('AddTaskBarGlobal', AddTaskBarGlobal);

  // hacky fix for ff
  AddTaskBarGlobal.$$ngIsClass = true;
})();

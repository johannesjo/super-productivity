/**
 * @ngdoc function
 * @name superProductivity.controller:EditGlobalLinkCtrl
 * @description
 * # EditGlobalLinkCtrl
 * Controller of the superProductivity
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .controller('EditGlobalLinkCtrl', EditGlobalLinkCtrl);

  /* @ngInject */
  function EditGlobalLinkCtrl($mdDialog, theme, link, GlobalLinkList) {
    let vm = this;
    const isNew = !link;

    vm.types = [
      'LINK',
      'FILE'
    ];
    vm.task = {};
    vm.theme = theme;
    vm.linkCopy = angular.copy(link) || {};

    if (vm.linkCopy.type) {
      vm.linkCopy.type = vm.types[0];
    }

    vm.saveGlobalLink = () => {
      if (isNew) {
        GlobalLinkList.addItem(vm.linkCopy);
      } else {
        angular.extend(link, vm.linkCopy);
      }

      $mdDialog.hide();
    };

    vm.cancel = () => {
      $mdDialog.hide();
    };
  }
})();

/**
 * @ngdoc directive
 * @name superProductivity.directive:editOnClick
 * @description
 * # editOnClick
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .constant('EDIT_ON_CLICK_TOGGLE_EV', 'EDIT_ON_CLICK_TOGGLE_EV')
    .directive('editOnClick', editOnClick);

  /* @ngInject */
  function editOnClick() {
    return {
      templateUrl: 'scripts/edit-on-click/edit-on-click-d.html',
      bindToController: true,
      controller: EditOnClickCtrl,
      controllerAs: 'vm',
      restrict: 'A',
      scope: {
        editOnClick: '=',
        editOnClickToggle: '=',
        editOnClickType: '@',
        editOnClickOnChange: '&'
      }
    };
  }

  /* @ngInject */
  function EditOnClickCtrl($element, $scope, $timeout, EDIT_ON_CLICK_TOGGLE_EV) {
    let vm = this;

    vm.toggleShowEdit = () => {
      vm.showEdit = true;
      $timeout(function () {
        let inputEl = $element.find('input');
        inputEl[0].focus();
      });
    };

    vm.change = (mVal) => {
      if (angular.isFunction(vm.editOnClickOnChange)) {
        vm.editOnClickOnChange({ $value: mVal });
      }
    };

    $scope.$on(EDIT_ON_CLICK_TOGGLE_EV, (ev, data) => {
      console.log(data);

      // for some weird reason we have to wait for vm.editOnClick to be ready
      if (!angular.isUndefined(vm.editOnClick)) {
        if (ev.defaultPrevented) {
          return;
        }
        ev.preventDefault();
        vm.toggleShowEdit();
      }
    });
  }

})();

/**
 * @ngdoc directive
 * @name superProductivity.directive:editOnClickDuration
 * @description
 * # editOnClickDuration
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .constant('EDIT_ON_CLICK_TOGGLE_EV', 'EDIT_ON_CLICK_TOGGLE_EV')
    .directive('editOnClickDuration', editOnClickDuration);

  /* @ngInject */
  function editOnClickDuration() {
    return {
      templateUrl: 'scripts/edit-on-click/edit-on-click-duration-d.html',
      bindToController: true,
      controller: EditOnClickDurationCtrl,
      controllerAs: 'vm',
      restrict: 'A',
      scope: {
        editOnClickDurationEvId: '@',
        editOnClickDuration: '=',
        editOnClickDurationOnEditFinished: '&'
      }
    };
  }

  /* @ngInject */
  function EditOnClickDurationCtrl($element, $scope, $timeout, EDIT_ON_CLICK_TOGGLE_EV) {
    let vm = this;

    vm.finishEdit = () => {
      vm.showEdit = false;
      if (angular.isFunction(vm.editOnClickDurationOnEditFinished)) {
        vm.editOnClickDurationOnEditFinished();
      }
    };

    vm.toggleShowEdit = () => {
      vm.showEdit = true;
      $timeout(function () {
        let inputEl = $element.find('input');
        inputEl[0].focus();
      });
    };


    $scope.$on(EDIT_ON_CLICK_TOGGLE_EV, (ev, eventId) => {
      if (eventId === vm.editOnClickDurationEvId) {
        vm.toggleShowEdit();
      }
    });
  }

})();

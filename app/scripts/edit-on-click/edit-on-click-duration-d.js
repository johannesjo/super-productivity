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
      let isChanged = (vm.editOnClickDuration !== vm.modelCopy);

      // check for show edit to only trigger once
      if (vm.showEdit && angular.isFunction(vm.editOnClickDurationOnEditFinished)) {
        vm.editOnClickDurationOnEditFinished({ isChanged });
      }

      vm.showEdit = false;

      if (isChanged) {
        // update if changes were made
        vm.editOnClickDuration = vm.modelCopy;
      }
    };

    vm.toggleShowEdit = () => {
      vm.showEdit = true;
      vm.modelCopy = vm.editOnClickDuration;
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

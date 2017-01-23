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
        editOnClickEvId: '@',
        editOnClick: '=',
        editOnClickOnEditFinished: '&'
      }
    };
  }

  /* @ngInject */
  function EditOnClickCtrl($element, $scope, $timeout, EDIT_ON_CLICK_TOGGLE_EV) {
    let vm = this;
    //const formEl = $element.find('form');
    const textEl = angular.element($element.find('div'));

    vm.finishEdit = () => {
      let isChanged = (vm.editOnClick !== vm.modelCopy);

      if (isChanged) {
        // update if changes were made
        vm.editOnClick = vm.modelCopy;
      }

      // check for show edit to only trigger once
      if (vm.showEdit && angular.isFunction(vm.editOnClickOnEditFinished)) {
        vm.editOnClickOnEditFinished({ isChanged, newVal: vm.editOnClick });
      }

      vm.showEdit = false;
      textEl.css('display', 'block');
    };

    vm.toggleShowEdit = () => {
      textEl.css('display', 'none');
      vm.showEdit = true;
      vm.modelCopy = angular.copy(vm.editOnClick);
      $timeout(function () {
        let inputEl = $element.find('input');
        inputEl[0].focus();
      });
    };

    $scope.$on(EDIT_ON_CLICK_TOGGLE_EV, (ev, eventId) => {
      if (eventId === vm.editOnClickEvId) {
        vm.toggleShowEdit();
      }
    });
  }

})();

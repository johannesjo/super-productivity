/**
 * @ngdoc directive
 * @name superProductivity.directive:editOnClick
 * @description
 * # editOnClick
 */

(function() {
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
        editOnClickEvId: '<',
        editOnClick: '=',
        editOnClickOnEditFinished: '&'
      }
    };
  }

  /* @ngInject */
  function EditOnClickCtrl($element, $scope, $timeout, EDIT_ON_CLICK_TOGGLE_EV) {
    let vm = this;
    let inputEl;
    let modelCopy;

    //const formEl = $element.find('form');
    const textEl = angular.element($element.find('div'));

    vm.finishEdit = () => {
      modelCopy = inputEl[0].value;
      let isChanged = (vm.editOnClick !== modelCopy);

      if (isChanged) {
        // update if changes were made
        vm.editOnClick = modelCopy;
      }

      // check for show edit to only trigger once
      if (vm.showEdit && angular.isFunction(vm.editOnClickOnEditFinished)) {
        vm.editOnClickOnEditFinished({
          isChanged,
          newVal: vm.editOnClick,
          $taskEl: $element[0].closest('.task')
        });
      }

      vm.showEdit = false;
      textEl.css('display', 'block');
    };

    vm.toggleShowEdit = () => {
      textEl.css('display', 'none');
      vm.showEdit = true;
      modelCopy = vm.editOnClick;
      $timeout(function() {
        inputEl = $element.find('input');
        inputEl[0].focus();
        inputEl[0].value = modelCopy;
      });
    };

    function clickToggleEvHandler(ev, eventId) {
      if (eventId === vm.editOnClickEvId) {
        vm.toggleShowEdit();
      }
    }

    $scope.$on(EDIT_ON_CLICK_TOGGLE_EV, clickToggleEvHandler);
  }

})();

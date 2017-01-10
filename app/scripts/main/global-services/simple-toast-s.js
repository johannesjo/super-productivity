/**
 * @ngdoc service
 * @name superProductivity.SimpleToast
 * @description
 * # SimpleToast
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .service('SimpleToast', SimpleToast);

  /* @ngInject */
  function SimpleToast($mdToast) {

    return (textContent) => {
      return $mdToast.show($mdToast.simple()
        .textContent(textContent)
        .position('bottom'));
    };
    // AngularJS will instantiate a singleton by calling "new" on this function
  }

})();

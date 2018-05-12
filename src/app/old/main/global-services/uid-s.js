/**
 * @ngdoc service
 * @name superProductivity.Uid
 * @description
 * # Uid
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .service('Uid', Uid);

  /* @ngInject */
  function Uid() {
    return () => {
      /* jshint ignore:start */
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      /* jshint ignore:end */
    };
  }

})();

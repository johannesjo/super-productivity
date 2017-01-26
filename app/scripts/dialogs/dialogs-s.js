/**
 * @ngdoc service
 * @name superProductivity.Dialogs
 * @description
 * # Dialogs
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .service('Dialogs', Dialogs);

  /* @ngInject */
  function Dialogs($mdDialog, DIALOGS) {
    //function doAsyncSeries(arr) {
    //  return arr.reduce(function (promise, item) {
    //    return promise.then(function () {
    //      return Jira.updateStatus(item.val, item.type);
    //    });
    //  }, $q.when('NOT_YET'));
    //}

    return function (dialogName, locals) {



      // copy and extend defaults for dialog
      let defaults = angular.copy(DIALOGS.DEFAULTS);
      let dialog = angular.extend(defaults, DIALOGS[dialogName]);

      // add passed variables
      dialog = angular.extend(dialog, {
        locals: locals
      });

      // return dialog instance for further handling
      return $mdDialog.show(dialog);
    };
  }

})();

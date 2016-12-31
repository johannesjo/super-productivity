/**
 * @ngdoc service
 * @name superProductivity.Dialogs
 * @description
 * # Dialogs
 * Service in the superProductivity.
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .service('Dialogs', Dialogs);

  /* @ngInject */
  function Dialogs($mdDialog, DIALOGS) {

    return function(dialogName, locals) {

      // copy and extend defaults for dialog
      let defaults = angular.copy(DIALOGS['DEFAULTS']);
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

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
  function Dialogs($mdDialog, DIALOGS, $q) {
    const dialogQueue = [];

    function createDialogObject(dialogName, locals) {
      // copy and extend defaults for dialog
      const defaults = angular.copy(DIALOGS.DEFAULTS);
      let dialog = angular.extend(defaults, DIALOGS[dialogName]);

      // add passed variables
      dialog = angular.extend(dialog, {
        locals: locals
      });
      return dialog;
    }

    function addToQueue(dialogObj, wrapperPromise) {
      dialogQueue.push({
        obj: dialogObj,
        wrapperPromise
      });
    }

    function removeLastResolvedFromQueue() {
      dialogQueue.shift();
    }

    function openNextInQueue() {
      let nextDialog = dialogQueue[0];

      if (nextDialog) {
        $mdDialog.show(nextDialog.obj)
          .then((res) => {
            nextDialog.wrapperPromise.resolve(res);
            removeLastResolvedFromQueue();
            openNextInQueue();
          }, (err) => {
            nextDialog.wrapperPromise.reject(err);
            removeLastResolvedFromQueue();
            openNextInQueue();
          });
      }
    }

    // actual method to call
    return function (dialogName, locals) {
      let wrapperPromise = $q.defer();
      const dialogObj = createDialogObject(dialogName, locals);
      addToQueue(dialogObj, wrapperPromise);

      // when there are currently no other open dialogs
      if (dialogQueue.length === 1) {
        // start dialog
        openNextInQueue();
      }

      return wrapperPromise.promise;
    };
  }

})();

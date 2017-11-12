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
  function Dialogs($mdDialog, DIALOGS, $q, $document, $rootScope) {
    const dialogQueue = [];

    function createDialogObject(dialogName, locals) {
      // copy and extend defaults for dialog
      const defaults = angular.copy(DIALOGS.DEFAULTS);
      let dialog = angular.extend(defaults, DIALOGS[dialogName]);

      if (!locals) {
        locals = {};
      }

      // pass default theme
      locals = angular.extend(locals, {
        theme: $rootScope.r.theme
      });

      // add passed variables
      dialog = angular.extend(dialog, {
        locals: locals,
        parent: angular.element($document[0].body)
      });
      return dialog;
    }

    function addToQueue(dialogObj, wrapperPromise, isNoQueue) {
      dialogQueue.push({
        obj: dialogObj,
        wrapperPromise,
        isNoQueue
      });
    }

    function removeLastResolvedFromQueue() {
      dialogQueue.shift();
    }

    function openNextInQueue() {
      let nextDialog = dialogQueue[0];

      if (nextDialog) {
        // if isNoQueue is set directly remove and open next one
        if (nextDialog.isNoQueue) {
          removeLastResolvedFromQueue();
          openNextInQueue();
          $mdDialog.show(nextDialog.obj)
            .then((res) => {
              nextDialog.wrapperPromise.resolve(res);
            }, (err) => {
              nextDialog.wrapperPromise.reject(err);
            })
            .catch((err) => {
              nextDialog.wrapperPromise.reject(err);
            });
        } else {
          $mdDialog.show(nextDialog.obj)
            .then((res) => {
              nextDialog.wrapperPromise.resolve(res);
              removeLastResolvedFromQueue();
              openNextInQueue();
            }, (err) => {
              nextDialog.wrapperPromise.reject(err);
              removeLastResolvedFromQueue();
              openNextInQueue();
            })
            .catch((err) => {
              nextDialog.wrapperPromise.reject(err);
              removeLastResolvedFromQueue();
              openNextInQueue();
            });
        }
      }
    }

    // actual method to call
    return function (dialogName, locals, isNoQueue) {
      let wrapperPromise = $q.defer();
      const dialogObj = createDialogObject(dialogName, locals);
      addToQueue(dialogObj, wrapperPromise, isNoQueue);

      // when there are currently no other open dialogs
      if (dialogQueue.length === 1) {
        // start dialog
        openNextInQueue();
      }

      return wrapperPromise.promise;
    };
  }

})();

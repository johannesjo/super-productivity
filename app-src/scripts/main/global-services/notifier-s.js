/**
 * @ngdoc service
 * @name superProductivity.Notifier
 * @description
 * # Notifier
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .service('Notifier', Notifier);

  /* @ngInject */
  function Notifier(IS_ELECTRON) {
    const IPC_NOTIFIER_EV = 'NOTIFY';

    return function (notification) {
      if (IS_ELECTRON) {
        // send to electron
        window.ipcRenderer.send(IPC_NOTIFIER_EV, notification);
      }
    };

  }

})();

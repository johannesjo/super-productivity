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

    if (!IS_ELECTRON && Notification && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    return function (notification) {
      if (IS_ELECTRON) {
        // send to electron
        window.ipcRenderer.send(IPC_NOTIFIER_EV, notification);
      } else if (Notification && Notification.permission === 'granted') {
        new Notification(notification.title, {
          icon: notification.icon || 'img/icon_128x128-with-pad.png',
          body: notification.message
        });
      }
    };

  }

})();

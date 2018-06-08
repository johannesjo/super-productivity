/**
 * @ngdoc service
 * @name superProductivity.Notifier
 * @description
 * # Notifier
 * Service in the superProductivity.
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .service('Notifier', Notifier);

  /* @ngInject */
  function Notifier(IS_ELECTRON) {
    const IPC_NOTIFIER_EV = 'NOTIFY';

    function isOldNotificationSupport() {
      // make weird mobile safari happy
      return !!window.Notification &&
        (typeof window.Notification === 'object' || typeof window.Notification === 'function');
    }

    function isOldNotificationPermissionGranted() {
      return isOldNotificationSupport() && (window.Notification.permission === 'granted');
    }

    function isServiceWorkerNotificationSupport() {
      return 'serviceWorker' in navigator;
    }

    const SCOPE = './service-workers/';
    const SERVICE_WORKER_URL = `${SCOPE}notifications.js`;
    if (!IS_ELECTRON) {
      if (isOldNotificationSupport() && isServiceWorkerNotificationSupport()) {
        window.Notification.requestPermission();
        navigator.serviceWorker.register(SERVICE_WORKER_URL);
      } else if (isOldNotificationSupport() && !isOldNotificationPermissionGranted()) {
        window.Notification.requestPermission();
      }
    }

    return function(notification) {
      if (IS_ELECTRON) {
        // send to electron
        window.ipcRenderer.send(IPC_NOTIFIER_EV, notification);
      } else if (isServiceWorkerNotificationSupport()) {
        navigator.serviceWorker.getRegistration(SERVICE_WORKER_URL)
          .then((reg) => {
            reg.showNotification(notification.title, {
              body: notification.message,
              icon: notification.icon || 'img/icon_128x128-with-pad.png',
              vibrate: [100, 50, 100],
              data: {
                dateOfArrival: Date.now(),
                primaryKey: 1
              },
            });
          });
      } else if (isOldNotificationPermissionGranted()) {
        const notificationInstance = new window.Notification(notification.title, {
          icon: notification.icon || 'img/icon_128x128-with-pad.png',
          body: notification.message
        });

        notificationInstance.onclick = () => {
          notificationInstance.close();
        };

        setTimeout(() => {
          notificationInstance.close();
        }, notification.time || 10000);
      }
    };
  }
})();

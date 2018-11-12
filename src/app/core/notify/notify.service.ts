import { Injectable } from '@angular/core';
import { NotifyModel } from './notify.model';

export const SERVICE_WORKER_URL = './service-workers/notifications.js';

@Injectable({
  providedIn: 'root'
})
export class NotifyService {

  constructor() {
    console.log('I am here!');
    Notification.requestPermission();


  }

  async notify(notification: Partial<NotifyModel>) {
    if (this._isServiceWorkerNotificationSupport()) {
      // await navigator.serviceWorker.ready;
      const registration = navigator.serviceWorker.getRegistration(SERVICE_WORKER_URL).then(res => console.log(res));
      console.log(registration);

      // return await registration.showNotification(notification.title, {
      //   body: notification.body,
      //   icon: notification.icon || 'assets/icons/icon-128x128.png',
      //   vibrate: [100, 50, 100],
      //   data: {
      //     dateOfArrival: Date.now(),
      //     primaryKey: 1
      //   },
      // }
      // );
    }
  }

  private _isServiceWorkerNotificationSupport() {
    return 'serviceWorker' in navigator;
  }
}

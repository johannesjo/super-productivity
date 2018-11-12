import { Injectable } from '@angular/core';
import { NotifyModel } from './notify.model';

@Injectable({
  providedIn: 'root'
})
export class NotifyService {
  async notify(notification: Partial<NotifyModel>) {
    if (this._isServiceWorkerNotificationSupport()) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const instance = new Notification(notification.title, {
          body: notification.body,
          icon: notification.icon || 'assets/icons/icon-128x128.png',
          vibrate: [100, 50, 100],
          data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
          },
        });
        instance.onclick = () => {
          instance.close();
        };
        setTimeout(() => {
          instance.close();
        }, notification.duration || 10000);
        return instance;
      } else {
        console.warn('No notifications supported');
      }
    }
  }

  private _isServiceWorkerNotificationSupport() {
    return 'Notification' in window;
  }
}

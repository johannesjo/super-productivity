import { Injectable } from '@angular/core';
import { NotifyModel } from './notify.model';

@Injectable({
  providedIn: 'root'
})
export class NotifyService {
  async notify(options: NotifyModel): Promise<Notification> {
    if (this._isBasicNotificationSupport()) {
      const permission = await Notification.requestPermission();
      // not supported for basic notifications so we delete them
      delete options.actions;
      if (permission === 'granted') {
        const instance = new Notification(options.title, {
          icon: 'assets/icons/icon-128x128.png',
          vibrate: [100, 50, 100],
          data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
          },
          ...options,
        });
        instance.onclick = () => {
          instance.close();
        };
        setTimeout(() => {
          instance.close();
        }, options.duration || 10000);
        return instance;
      } else {
        console.warn('No notifications supported');
        return null;
      }
    }
  }

  private _isBasicNotificationSupport() {
    return 'Notification' in window;
  }
}

import { Injectable } from '@angular/core';
import { NotifyModel } from './notify.model';
import { environment } from '../../../environments/environment';
import { IS_ELECTRON } from '../../app.constants';

@Injectable({
  providedIn: 'root',
})
export class NotifyService {
  async notify(options: NotifyModel): Promise<Notification> {
    if (this._isServiceWorkerAvailable()) {
      const reg = await navigator.serviceWorker.getRegistration('ngsw-worker.js');
      reg.showNotification(options.title, {
        icon: 'assets/icons/icon-128x128.png',
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: 1
        },
        ...options,
      });

    } else if (this._isBasicNotificationSupport()) {
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

  private _isBasicNotificationSupport(): boolean {
    return 'Notification' in window;
  }

  private _isServiceWorkerAvailable(): boolean {
    return 'serviceWorker' in navigator && environment.production && !IS_ELECTRON;
  }
}

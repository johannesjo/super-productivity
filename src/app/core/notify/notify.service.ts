import {Injectable} from '@angular/core';
import {NotifyModel} from './notify.model';
import {environment} from '../../../environments/environment';
import {IS_ELECTRON} from '../../app.constants';
import {IS_MOBILE} from '../../util/is-mobile';
import {ElectronService} from 'ngx-electron';
import {IPC_SHOW_OR_FOCUS} from '../../../../electron/ipc-events.const';
import {TranslateService} from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class NotifyService {
  constructor(
    private _electronService: ElectronService,
    private _translateService: TranslateService,
  ) {
  }

  async notifyDesktop(options: NotifyModel) {
    if (!IS_MOBILE) {
      return this.notify(options);
    }
  }

  async notify(options: NotifyModel): Promise<Notification> {
    const title = this._translateService.instant(options.title, options.translateParams);

    if (this._isServiceWorkerAvailable()) {
      const reg = await navigator.serviceWorker.getRegistration('ngsw-worker.js');
      reg.showNotification(title, {
        icon: 'assets/icons/icon-128x128.png',
        vibrate: [100, 50, 100],
        silent: false,
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
        const instance = new Notification(title, {
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
          if (IS_ELECTRON) {
            this._electronService.ipcRenderer.send(IPC_SHOW_OR_FOCUS);
          }
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

import { inject, Injectable } from '@angular/core';
import { NotifyModel } from './notify.model';
import { environment } from '../../../environments/environment';
import { IS_ELECTRON } from '../../app.constants';
import { IS_MOBILE } from '../../util/is-mobile';
import { TranslateService } from '@ngx-translate/core';
import { UiHelperService } from '../../features/ui-helper/ui-helper.service';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';

@Injectable({
  providedIn: 'root',
})
export class NotifyService {
  private _translateService = inject(TranslateService);
  private _uiHelperService = inject(UiHelperService);

  async notifyDesktop(options: NotifyModel): Promise<Notification | undefined> {
    if (!IS_MOBILE) {
      return this.notify(options);
    }
    return;
  }

  async notify(options: NotifyModel): Promise<Notification | undefined> {
    const title =
      options.title &&
      this._translateService.instant(options.title, options.translateParams);
    const body =
      options.body &&
      this._translateService.instant(options.body, options.translateParams);

    const svcReg =
      this._isServiceWorkerAvailable() &&
      (await navigator.serviceWorker.getRegistration('ngsw-worker.js'));

    if (svcReg && svcReg.showNotification) {
      // service worker also seems to need to request permission...
      // @see: https://github.com/johannesjo/super-productivity/issues/408
      const per = await Notification.requestPermission();
      // not supported for basic notifications so we delete them
      if (per === 'granted') {
        await svcReg.showNotification(title, {
          icon: 'assets/icons/icon-128x128.png',
          silent: false,
          data: {
            dateOfArrival: Date.now(),
            primaryKey: 1,
          },
          ...options,
          body,
        });
      }
    } else if (IS_ANDROID_WEB_VIEW) {
      // TODO maybe use capacitor plugin here as well though it probably doesn't make sense for most cases
    } else if (this._isBasicNotificationSupport()) {
      const permission = await Notification.requestPermission();
      // not supported for basic notifications so we delete them
      // delete options.actions;
      if (permission === 'granted') {
        const instance = new Notification(title, {
          icon: 'assets/icons/icon-128x128.png',
          silent: false,
          data: {
            dateOfArrival: Date.now(),
            primaryKey: 1,
          },
          ...options,
          body,
        });
        instance.onclick = () => {
          instance.close();
          if (IS_ELECTRON) {
            this._uiHelperService.focusApp();
          }
        };
        setTimeout(() => {
          instance.close();
        }, options.duration || 10000);
        return instance;
      }
    }
    console.warn('No notifications supported');
    return undefined;
  }

  private _isBasicNotificationSupport(): boolean {
    return 'Notification' in window;
  }

  private _isServiceWorkerAvailable(): boolean {
    return (
      'serviceWorker' in navigator &&
      (environment.production || environment.stage) &&
      !IS_ELECTRON
    );
  }
}

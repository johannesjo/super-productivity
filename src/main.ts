import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { IS_ELECTRON } from './app/app.constants';
import { IS_ANDROID_WEB_VIEW } from './app/util/is-android-web-view';
import { androidInterface } from './app/features/android/android-interface';
import { ElectronAPI } from '../electron/electronAPI.d';

if (environment.production || environment.stage) {
  enableProdMode();
}

declare global {
  interface Window {
    ea: ElectronAPI;
  }
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .then(() => {
    // TODO make asset caching work for electron
    if (
      'serviceWorker' in navigator &&
      (environment.production || environment.stage) &&
      !IS_ELECTRON
    ) {
      console.log('Registering Service worker');
      return navigator.serviceWorker.register('ngsw-worker.js');
    } else if ('serviceWorker' in navigator && IS_ELECTRON) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        })
        .catch((e) => {
          console.error('ERROR when unregistering service worker');
          console.error(e);
        });
    }
    return;
  })
  .catch((err: any) => {
    console.log('Service Worker Registration Error');
    console.log(err);
  });

// fix mobile scrolling while dragging
window.addEventListener('touchmove', () => {});

if (!(environment.production || environment.stage) && IS_ANDROID_WEB_VIEW) {
  setTimeout(() => {
    androidInterface.showToast('Android DEV works');
    console.log(androidInterface);
  }, 1000);
}

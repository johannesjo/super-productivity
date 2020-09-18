import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { IS_ELECTRON } from './app/app.constants';
import { IS_ANDROID_WEB_VIEW } from './app/util/is-android-web-view';
import { androidInterface } from './app/core/android/android-interface';

if (environment.production || environment.stage) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule).then(() => {
  // TODO make asset caching work for electron
  if ('serviceWorker' in navigator && (environment.production || environment.stage) && !IS_ELECTRON) {
    console.log('Registering Service worker');
    return navigator.serviceWorker.register('ngsw-worker.js');
  }
  return;
}).catch(err => {
  console.log('Service Worker Registration Error');
  console.log(err);
});

// fix mobile scrolling while dragging
window.addEventListener('touchmove', () => {
});

if (!(environment.production || environment.stage) && IS_ANDROID_WEB_VIEW) {
  setTimeout(() => {
    androidInterface.showToast('Android DEV works');
    console.log(androidInterface);
  }, 1000);
}

import { Injectable } from '@angular/core';
import { ExtensionInterfaceEventName } from './chrome-extension-interface';

const interfaceEl = window;

@Injectable({
  providedIn: 'root'
})
export class ChromeExtensionInterfaceService {
  isInterfaceReady = false;

  init() {
    interfaceEl.addEventListener('SP_EXTENSION_READY', () => {
      // we only want to show the notification once
      if (!this.isInterfaceReady) {
        console.log('SUCCESS', 'Super Productivity Extension found and loaded.');
      }
      this.isInterfaceReady = true;
    });
  }

  addEventListener(evName: ExtensionInterfaceEventName, cb) {
    interfaceEl.addEventListener(evName, (ev: CustomEvent) => {
      cb(ev, ev.detail);
    });
  }

  dispatchEvent(evName: ExtensionInterfaceEventName, data) {
    const ev = new CustomEvent(evName, {
      detail: data,
    });
    console.log(ev);


    if (this.isInterfaceReady) {
      interfaceEl.dispatchEvent(ev);
    } else {
      setTimeout(() => {
        interfaceEl.dispatchEvent(ev);
      }, 2000);
    }
  }
}

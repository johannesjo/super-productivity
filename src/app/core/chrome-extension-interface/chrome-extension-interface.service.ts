import { Injectable } from '@angular/core';
import { ExtensionInterfaceEventName } from './chrome-extension-interface';
import { ReplaySubject } from 'rxjs';
import { first } from 'rxjs/operators';

const interfaceEl = window;

@Injectable({
  providedIn: 'root'
})
export class ChromeExtensionInterfaceService {
  private _isReady$: ReplaySubject<boolean> = new ReplaySubject();
  private _isInterfaceReady = false;

  // we only every one to catch a single event
  public isReady$ = this._isReady$.pipe(first());

  init() {
    interfaceEl.addEventListener('SP_EXTENSION_READY', () => {
      // we only want to show the notification once
      if (!this._isInterfaceReady) {
        console.log('SUCCESS', 'Super Productivity Extension found and loaded.');
        this._isInterfaceReady = true;
        this._isReady$.next(true);
      }
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


    if (this._isInterfaceReady) {
      interfaceEl.dispatchEvent(ev);
    } else {
      setTimeout(() => {
        interfaceEl.dispatchEvent(ev);
      }, 2000);
    }
  }
}

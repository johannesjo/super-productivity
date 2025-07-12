import { Injectable } from '@angular/core';
import { ExtensionInterfaceEventName } from './chrome-extension-interface';
import { Observable, ReplaySubject } from 'rxjs';
import { first, startWith } from 'rxjs/operators';
import { Log } from '../log';

const interfaceEl = window;

@Injectable({
  providedIn: 'root',
})
export class ChromeExtensionInterfaceService {
  // handled as private but needs to assigned first
  _onReady$: ReplaySubject<boolean> = new ReplaySubject(1);
  onReady$: Observable<boolean> = this._onReady$.pipe(first());
  isReady$: Observable<boolean> = this.onReady$.pipe(startWith(false));
  // we only every one to catch a single event
  private _isInterfaceReady: boolean = false;

  init(): void {
    interfaceEl.addEventListener('SP_EXTENSION_READY', () => {
      // we only want to show the notification once
      if (!this._isInterfaceReady) {
        Log.log('SUCCESS', 'Super Productivity Extension found and loaded.');
        this._isInterfaceReady = true;
        this._onReady$.next(true);
      }
    });
  }

  addEventListener(
    evName: ExtensionInterfaceEventName,
    cb: (ev: Event, data?: unknown) => void,
  ): void {
    interfaceEl.addEventListener(evName, (ev: Event) => {
      const event = ev as CustomEvent;
      cb(event, event.detail);
    });
  }

  dispatchEvent(evName: ExtensionInterfaceEventName, data: unknown): void {
    const ev = new CustomEvent(evName, {
      detail: data,
    });

    if (this._isInterfaceReady) {
      interfaceEl.dispatchEvent(ev);
    } else {
      setTimeout(() => {
        interfaceEl.dispatchEvent(ev);
      }, 2000);
    }
  }
}

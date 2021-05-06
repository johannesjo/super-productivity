import { Inject, Injectable } from '@angular/core';
import { loadFromRealLs, saveToRealLs } from '../../core/persistence/local-storage';
import { LS_LOCAL_UI_HELPER } from '../../core/persistence/ls-keys.const';
import { DOCUMENT } from '@angular/common';
import { LocalUiHelperSettings } from './ui-helper.model';
import { UI_LOCAL_HELPER_DEFAULT } from './ui-helper.const';
import { ElectronService } from '../../core/electron/electron.service';
import { IPC } from '../../../../electron/ipc-events.const';
import { IS_ELECTRON } from '../../app.constants';
import { fromEvent } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { ipcRenderer, webFrame } from 'electron';

@Injectable({ providedIn: 'root' })
export class UiHelperService {
  private _webFrame: typeof webFrame = this._electronService.webFrame as typeof webFrame;

  constructor(
    @Inject(DOCUMENT) private _document: Document,
    private _electronService: ElectronService,
  ) {}

  initElectron() {
    this._initMousewheelZoomForElectron();
  }

  zoomTo(zoomFactor: number) {
    if (Number.isNaN(zoomFactor)) {
      console.error('Invalid zoom factor', zoomFactor);
      return;
    }

    this._webFrame.setZoomFactor(zoomFactor);
    this._updateLocalUiHelperSettings({ zoomFactor });
  }

  zoomBy(zoomBy: number) {
    if (Number.isNaN(zoomBy)) {
      console.error('Invalid zoom factor', zoomBy);
      return;
    }
    const currentZoom = this._webFrame.getZoomFactor();
    const zoomFactor = currentZoom + zoomBy;

    this._webFrame.setZoomFactor(zoomFactor);
    this._updateLocalUiHelperSettings({ zoomFactor });
  }

  focusApp() {
    if (IS_ELECTRON) {
      //  otherwise the last focused task get's focused again leading to unintended keyboard events
      if (document.activeElement) {
        (document.activeElement as HTMLElement).blur();
      }

      (this._electronService.ipcRenderer as typeof ipcRenderer).send(IPC.SHOW_OR_FOCUS);
    } else {
      console.error('Cannot execute focus app window in browser');
    }
  }

  private _initMousewheelZoomForElectron() {
    const ZOOM_DELTA = 0.025;

    // set initial zoom
    this.zoomTo(this._getLocalUiHelperSettings().zoomFactor);

    fromEvent(this._document, 'mousewheel')
      .pipe(throttleTime(20))
      .subscribe((event: any) => {
        if (event && event.ctrlKey) {
          // this does not prevent scrolling unfortunately
          // event.preventDefault();

          let zoomFactor = this._webFrame.getZoomFactor();
          if (event.deltaY > 0) {
            zoomFactor -= ZOOM_DELTA;
          } else if (event.deltaY < 0) {
            zoomFactor += ZOOM_DELTA;
          }
          zoomFactor = Math.min(Math.max(zoomFactor, 0.1), 4);
          this.zoomTo(zoomFactor);
        }
      });
  }

  private _getLocalUiHelperSettings(): LocalUiHelperSettings {
    return (
      (loadFromRealLs(LS_LOCAL_UI_HELPER) as LocalUiHelperSettings) ||
      UI_LOCAL_HELPER_DEFAULT
    );
  }

  private _updateLocalUiHelperSettings(newCfg: Partial<LocalUiHelperSettings>) {
    saveToRealLs(LS_LOCAL_UI_HELPER, {
      ...this._getLocalUiHelperSettings(),
      ...newCfg,
    });
  }
}

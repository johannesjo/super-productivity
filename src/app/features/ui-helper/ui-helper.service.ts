import {Inject, Injectable} from '@angular/core';
import {loadFromLs, saveToLs} from '../../core/persistence/local-storage';
import {LS_LOCAL_UI_HELPER} from '../../core/persistence/ls-keys.const';
import {ElectronService} from 'ngx-electron';
import {DOCUMENT} from '@angular/common';
import {LocalUiHelperSettings} from './ui-helper.model';
import {UI_LOCAL_HELPER_DEFAULT} from './ui-helper.const';

@Injectable({
  providedIn: 'root'
})
export class UiHelperService {
  private _webFrame = this._electronService.webFrame;

  constructor(
    @Inject(DOCUMENT) private _document: Document,
    private _electronService: ElectronService,
  ) {
  }

  initElectron() {
    this._initMousewheelZoomForElectron();
  }

  zoom(zoomFactor: number) {
    if (Number.isNaN(zoomFactor) || typeof zoomFactor !== 'number') {
      console.error('Invalid zoom factor', zoomFactor);
      return;
    }

    this._webFrame.setZoomFactor(zoomFactor);
    this._updateLocalUiHelperSettings({zoomFactor});
  }

  private _initMousewheelZoomForElectron() {
    const ZOOM_DELTA = 0.05;

    // set initial zoom
    this.zoom(this._getLocalUiHelperSettings().zoomFactor);

    this._document.addEventListener('mousewheel', (event: WheelEvent) => {
      if (event && event.ctrlKey) {
        let zoomFactor = this._webFrame.getZoomFactor();
        if (event.deltaY > 0) {
          zoomFactor -= ZOOM_DELTA;
        } else if (event.deltaY < 0) {
          zoomFactor += ZOOM_DELTA;
        }
        zoomFactor = Math.min(Math.max(zoomFactor, 0.1), 4);
        this.zoom(zoomFactor);
      }
    }, false);
  }

  private _getLocalUiHelperSettings(): LocalUiHelperSettings {
    return loadFromLs(LS_LOCAL_UI_HELPER) || UI_LOCAL_HELPER_DEFAULT;
  }

  private _updateLocalUiHelperSettings(newCfg: Partial<LocalUiHelperSettings>) {
    saveToLs(LS_LOCAL_UI_HELPER, {
      ...this._getLocalUiHelperSettings(),
      ...newCfg,
    });
  }
}

import {ErrorHandler, Injectable} from '@angular/core';
import {isObject} from '../../util/is-object';
import {getJiraResponseErrorTxt} from '../../util/get-jira-response-error-text';
import {HANDLED_ERROR, IS_ELECTRON} from '../../app.constants';
import {ElectronService} from 'ngx-electron';
import {BannerService} from '../banner/banner.service';

let isWasErrorAlertCreated = false;

const _createErrorAlert = (eSvc: ElectronService, err: string, stackTrace: string) => {
  console.log(stackTrace);

  if (isWasErrorAlertCreated) {
    return;
  }

  const errorAlert = document.createElement('div');
  errorAlert.classList.add('global-error-alert');
  errorAlert.style.color = 'black';
  errorAlert.innerHTML = `
    <h2>Snap! A critical error occurred...<h2>
    <p><a href="https://github.com/johannesjo/super-productivity/issues/new" target="_blank">! Please Report !</a></p>
    <pre style="line-height: 1.3;">${err}</pre>
    <pre style="line-height: 1.3; text-align: left; max-height: 240px; font-size: 12px; overflow: auto;">${stackTrace}</pre>
    `;
  const btnReload = document.createElement('BUTTON');
  btnReload.innerText = 'Reload App';
  btnReload.addEventListener('click', () => {
    if (IS_ELECTRON) {
      eSvc.remote.getCurrentWindow().webContents.reload();
    } else {
      window.location.reload();
    }
  });
  errorAlert.append(btnReload);
  document.body.append(errorAlert);
  isWasErrorAlertCreated = true;

  if (IS_ELECTRON) {
    eSvc.remote.getCurrentWindow().webContents.openDevTools();
  }
};


@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private _electronLogger: any;

  constructor(
    private _bannerService: BannerService,
    private _electronService: ElectronService,
  ) {
    if (IS_ELECTRON) {
      this._electronLogger = this._electronService.remote.require('electron-log');
    }
  }

  // TODO Cleanup this mess
  handleError(err: any) {
    const errStr = (typeof err === 'string') ? err : err.toString();
    // tslint:disable-next-line
    const stack = err && err.stack;


    // if not our custom error handler we have a critical error on our hands
    if (!err || (!err.handledError && (errStr && !errStr.match(HANDLED_ERROR)))) {
      const errorStr = this._getErrorStr(err) || errStr;

      // NOTE: dom exceptions will break all rendering that's why
      if (err.constructor && err.constructor === DOMException) {
        _createErrorAlert(this._electronService, 'DOMException: ' + errorStr, stack);
      } else {
        _createErrorAlert(this._electronService, errorStr, stack);
      }
    }

    console.error('GLOBAL_ERROR_HANDLER', err);
    if (IS_ELECTRON) {
      this._electronLogger.error('Frontend Error:', err, stack);
    }

    // NOTE: rethrow the error otherwise it gets swallowed
    throw err;
  }

  private _getErrorStr(err: any): string {
    if (isObject(err)) {
      return getJiraResponseErrorTxt(err);
    } else {
      return err.toString();
    }
  }
}

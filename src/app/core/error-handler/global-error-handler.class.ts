import {ErrorHandler, Injectable} from '@angular/core';
import {isObject} from '../../util/is-object';
import {getJiraResponseErrorTxt} from '../../util/get-jira-response-error-text';
import {HANDLED_ERROR_PROP_STR, IS_ELECTRON} from '../../app.constants';
import {BannerService} from '../banner/banner.service';
import * as StackTrace from 'stacktrace-js';
import {ElectronService} from '../electron/electron.service';
import {environment} from '../../../environments/environment';

let isWasErrorAlertCreated = false;

const _cleanHtml = (str: string): string => {
  const div = document.createElement('div');
  div.innerHTML = str;
  return div.textContent || div.innerText || '';
};

const _createErrorAlert = (eSvc: ElectronService, err: string = '', stackTrace: string, origErr: any) => {
  if (isWasErrorAlertCreated) {
    return;
  }
  // it seems for whatever reasons, sometimes we get tags in our error which break the html
  const errEscaped = _cleanHtml(err);

  const errorAlert = document.createElement('div');
  errorAlert.classList.add('global-error-alert');
  errorAlert.style.color = 'black';
  errorAlert.style.maxHeight = '100vh';
  errorAlert.innerHTML = `
    <h2 style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 2px;">${errEscaped}<h2>
    <p><a href="https://github.com/johannesjo/super-productivity/issues/new" target="_blank">! Please copy & report !</a></p>
    <!-- second error is needed, because it might be too long -->
    <pre style="line-height: 1.3;">${errEscaped}</pre>

    <pre id="stack-trace"
         style="line-height: 1.3; text-align: left; max-height: 240px; font-size: 12px; overflow: auto;">${stackTrace}</pre>
    <pre style="line-height: 1.3; font-size: 12px;">${getSimpleMeta()}</pre>
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
  getStacktrace(origErr).then(stack => {
    console.log(stack);
    document.getElementById('stack-trace').innerText = stack;
  })
    // NOTE: there is an issue with this sometimes -> https://github.com/stacktracejs/stacktrace.js/issues/202
    .catch(console.error);

  if (IS_ELECTRON) {
    eSvc.remote.getCurrentWindow().webContents.openDevTools();
  }
};

async function getStacktrace(err): Promise<string> {
  const isHttpError = err && (err.url || err.headers);
  const isErrorWithStack = err && err.stack;

  // Don't try to send stacktraces of HTTP errors as they are already logged on the server
  if (!isHttpError && isErrorWithStack && !isHandledError(err)) {
    return StackTrace.fromError(err)
      .then((stackframes) => {
        return stackframes
          .splice(0, 20)
          .map((sf) => {
            return sf.toString();
          }).join('\n');
      });
  } else {
    console.warn('Error without stack', err);
    return Promise.resolve('');
  }
}

const getSimpleMeta = (): string => {
  const n = window.navigator;
  return `META: SP${environment.version} ${IS_ELECTRON ? 'Electron' : 'Browser'} – ${n.language} – ${n.platform} – ${n.userAgent}`;
};

const isHandledError = (err): boolean => {
  const errStr = (typeof err === 'string') ? err : err.toString();
  // NOTE: for some unknown reason sometimes err is undefined while err.toString is not...
  // this is why we also check the string value
  return (err && err.hasOwnProperty(HANDLED_ERROR_PROP_STR)) || (errStr.match(HANDLED_ERROR_PROP_STR));
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
    const simpleStack = err && err.stack;
    console.error('GLOBAL_ERROR_HANDLER', err);

    // if not our custom error handler we have a critical error on our hands
    if (!isHandledError(err)) {
      const errorStr = this._getErrorStr(err) || errStr;

      // NOTE: dom exceptions will break all rendering that's why
      if (err.constructor && err.constructor === DOMException) {
        _createErrorAlert(this._electronService, 'DOMException: ' + errorStr, simpleStack, err);
      } else {
        _createErrorAlert(this._electronService, errorStr, simpleStack, err);
      }
      console.log(getSimpleMeta());
    }

    if (IS_ELECTRON) {
      this._electronLogger.error('Frontend Error:', err, simpleStack);
      getStacktrace(err).then(stack => {
        this._electronLogger.error('Frontend Error Stack:', err, stack);
      })
        // NOTE: there is an issue with this sometimes -> https://github.com/stacktracejs/stacktrace.js/issues/202
        .catch(console.error);
    }

    if (!isHandledError(err)) {
      // NOTE: rethrow the error otherwise it gets swallowed
      throw new Error(err);
    }
  }

  private _getErrorStr(err: any): string {
    if (isObject(err)) {
      return getJiraResponseErrorTxt(err);
    } else {
      return err.toString();
    }
  }
}

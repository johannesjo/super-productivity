import {ElectronService} from '../electron/electron.service';
import {HANDLED_ERROR_PROP_STR, IS_ELECTRON} from '../../app.constants';
import {environment} from '../../../environments/environment';
import * as StackTrace from 'stacktrace-js';
import * as pThrottle from 'p-throttle';

let isWasErrorAlertCreated = false;

async function _getStacktrace(err): Promise<string> {
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

const _getStacktraceThrottled = pThrottle(_getStacktrace, 2, 5000);

export const logAdvancedStacktrace = (origErr, additionalLogFn?: (stack: string) => void) => _getStacktraceThrottled(origErr).then(stack => {
  console.log(stack);

  if (additionalLogFn) {
    additionalLogFn(stack);
  }
  // append to dialog
  const stacktraceEl = document.getElementById('stack-trace');
  if (stacktraceEl) {
    document.getElementById('stack-trace').innerText = stack;
  }

// NOTE: there is an issue with this sometimes -> https://github.com/stacktracejs/stacktrace.js/issues/202
}).catch(console.error);


const _cleanHtml = (str: string): string => {
  const div = document.createElement('div');
  div.innerHTML = str;
  return div.textContent || div.innerText || '';
};

export const createErrorAlert = (eSvc: ElectronService, err: string = '', stackTrace: string, origErr: any) => {
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

  if (IS_ELECTRON) {
    eSvc.remote.getCurrentWindow().webContents.openDevTools();
  }
};


export const getSimpleMeta = (): string => {
  const n = window.navigator;
  return `META: SP${environment.version} ${IS_ELECTRON ? 'Electron' : 'Browser'} – ${n.language} – ${n.platform} – ${n.userAgent}`;
};

export const isHandledError = (err): boolean => {
  const errStr = (typeof err === 'string') ? err : err.toString();
  // NOTE: for some unknown reason sometimes err is undefined while err.toString is not...
  // this is why we also check the string value
  return (err && err.hasOwnProperty(HANDLED_ERROR_PROP_STR)) || (errStr.match(HANDLED_ERROR_PROP_STR));
};

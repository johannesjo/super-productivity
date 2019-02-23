import { ErrorHandler, Injectable } from '@angular/core';
import { SnackService } from '../snack/snack.service';
import { isObject } from '../../util/is-object';
import { getJiraResponseErrorTxt } from '../../util/get-jira-response-error-text';
import { HANDLED_ERROR, IS_ELECTRON } from '../../app.constants';
import { ElectronService } from 'ngx-electron';

const _createErrorAlert = (err: string) => {
  const errorAlert = document.createElement('div');
  errorAlert.classList.add('global-error-alert');
  errorAlert.innerHTML = `
    <h2>An error occurred<h2>
    <p><a href="https://github.com/johannesjo/super-productivity/issues/new" target="_blank">Please Report</a></p>
    <pre>${err}</pre>
    `;
  const btnReload = document.createElement('BUTTON');
  btnReload.innerText = 'Reload App';
  btnReload.addEventListener('click', () => {
    window.location.reload();
  });
  errorAlert.append(btnReload);
  document.body.append(errorAlert);
};

// chrome only??
const _getStackTrace = () => {
  const obj: any = {};
  Error.captureStackTrace(obj, _getStackTrace);
  return obj.stack;
};


@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private _electronLogger: any;

  constructor(
    private _snackService: SnackService,
    private _electronService: ElectronService,
  ) {
    if (IS_ELECTRON) {
      this._electronLogger = this._electronService.remote.require('electron-log');
    }
  }

  handleError(err: any) {
    // if not our custom error handler we have a critical error on our hands
    if (!err || (!err.handledError && (typeof err === 'string' && !err.match(HANDLED_ERROR)))) {
      const errorStr = this._getErrorStr(err);

      // NOTE: snack won't work most of the time
      try {
        this._snackService.open({
          type: 'GLOBAL_ERROR',
          config: {
            // display basically forever
            duration: 60 * 60 * 24 * 1000,
          },
          message: errorStr.substring(0, 150),
        });
      } catch (e) {
        _createErrorAlert(errorStr);
      }
    }
    console.error('GLOBAL_ERROR_HANDLER', err);
    if (IS_ELECTRON) {
      let stackTrace;
      try {
        stackTrace = _getStackTrace();
      } catch (e) {
        stackTrace = '';
      }
      this._electronLogger.error('Frontend Error:', err, stackTrace);
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

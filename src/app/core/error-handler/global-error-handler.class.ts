import { ErrorHandler, Injectable } from '@angular/core';
import { isObject } from '../../util/is-object';
import { getErrorTxt } from '../../util/get-error-text';
import { IS_ELECTRON } from '../../app.constants';
import { ElectronService } from '../electron/electron.service';
import { createErrorAlert, isHandledError, logAdvancedStacktrace } from './global-error-handler.util';
import { remote } from 'electron';
import { saveBeforeLastErrorActionLog } from '../../util/action-logger';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private _electronLogger: any;

  constructor(
    private _electronService: ElectronService,
  ) {
    if (IS_ELECTRON) {
      this._electronLogger = (this._electronService.remote as typeof remote).require('electron-log');
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
      saveBeforeLastErrorActionLog();

      // NOTE: dom exceptions will break all rendering that's why
      if (err.constructor && err.constructor === DOMException) {
        createErrorAlert(this._electronService, 'DOMException: ' + errorStr, simpleStack, err);
      } else {
        createErrorAlert(this._electronService, errorStr, simpleStack, err);
      }
    }

    if (IS_ELECTRON) {
      this._electronLogger.error('Frontend Error:', err, simpleStack);
    }

    const additionalLog = IS_ELECTRON
      ? (stack: unknown) => this._electronLogger.error('Frontend Error Stack:', stack)
      : () => null;

    logAdvancedStacktrace(err, additionalLog).then();

    if (!isHandledError(err)) {
      // NOTE: rethrow the error otherwise it gets swallowed
      throw new Error(err);
    }
  }

  private _getErrorStr(err: unknown): string {
    if (isObject(err)) {
      const str = getErrorTxt(err);
      return (typeof str === 'string')
        ? str
        : 'Unable to parse error string. Please see console error';
    } else {
      return (err as any).toString();
    }
  }
}

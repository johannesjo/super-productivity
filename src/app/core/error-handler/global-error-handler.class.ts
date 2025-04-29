import { ErrorHandler, inject, Injectable, Injector } from '@angular/core';
import { isObject } from '../../util/is-object';
import { getErrorTxt } from '../../util/get-error-text';
import { IS_ELECTRON } from '../../app.constants';
import {
  createErrorAlert,
  isHandledError,
  logAdvancedStacktrace,
} from './global-error-handler.util';
import { saveBeforeLastErrorActionLog } from '../../util/action-logger';
import { error } from 'electron-log/renderer';
import { PfapiService } from '../../pfapi/pfapi.service';
import { CompleteBackup } from '../../pfapi/api';

let isErrorAlertShown = false;

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private injector = inject<Injector>(Injector);

  // TODO Cleanup this mess
  async handleError(err: any): Promise<void> {
    const errStr = typeof err === 'string' ? err : err.toString();
    // eslint-disable-next-line
    const simpleStack = err && err.stack;
    console.error('GLOBAL_ERROR_HANDLER', err);

    // if not our custom error handler we have a critical error on our hands
    if (!isHandledError(err) && !isErrorAlertShown) {
      // we only show the alert for the very first error, as it probably is the most helpful one
      // NOTE we need to set isErrorAlertShow before any async action, since errors thrown at the same time might
      // still show multiple dialogs
      isErrorAlertShown = true;
      const errorStr = this._getErrorStr(err) || errStr;
      saveBeforeLastErrorActionLog();
      createErrorAlert(errorStr, simpleStack, err, await this._getUserData());
    }

    if (IS_ELECTRON) {
      error('Frontend Error:', err, simpleStack);
    }

    const additionalLog = IS_ELECTRON
      ? (stack: unknown) => error('Frontend Error Stack:', stack)
      : () => null;

    logAdvancedStacktrace(err, additionalLog).then();

    if (!isHandledError(err)) {
      // NOTE: rethrow the error otherwise it gets swallowed
      throw err;
    }
  }

  private _getErrorStr(err: unknown): string {
    if (isObject(err)) {
      const str = getErrorTxt(err);
      return typeof str === 'string'
        ? str
        : 'Unable to parse error string. Please see console error';
    } else {
      return (err as any).toString();
    }
  }

  private async _getUserData(): Promise<CompleteBackup<any> | undefined> {
    try {
      return await this.injector.get(PfapiService).pf.loadCompleteBackup(true);
    } catch (e) {
      console.warn('Cannot load user data for error modal');
      console.error(e);
      return undefined;
    }
  }
}

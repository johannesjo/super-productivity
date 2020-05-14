import {ErrorHandler, Injectable} from '@angular/core';
import {isObject} from '../../util/is-object';
import {getJiraResponseErrorTxt} from '../../util/get-jira-response-error-text';
import {IS_ELECTRON} from '../../app.constants';
import {BannerService} from '../banner/banner.service';
import {ElectronService} from '../electron/electron.service';
import {createErrorAlert, getSimpleMeta, isHandledError, logAdvancedStacktrace} from './global-error-handler.util';


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
        createErrorAlert(this._electronService, 'DOMException: ' + errorStr, simpleStack, err);
      } else {
        createErrorAlert(this._electronService, errorStr, simpleStack, err);
      }
      console.log(getSimpleMeta());
    }

    if (IS_ELECTRON) {
      this._electronLogger.error('Frontend Error:', err, simpleStack);
    }

    const additionalLog = IS_ELECTRON
      ? (stack) => this._electronLogger.error('Frontend Error Stack:', stack)
      : () => null;

    logAdvancedStacktrace(err, additionalLog).then();

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

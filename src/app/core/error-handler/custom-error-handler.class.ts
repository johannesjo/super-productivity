import { ErrorHandler, Injectable } from '@angular/core';
import { SnackService } from '../snack/snack.service';
import { isObject } from '../../util/is-object';
import { getJiraResponseErrorTxt } from '../../util/get-jira-response-error-text';
import { HANDLED_ERROR } from '../../app.constants';

const _createErrorAlert = (error: string) => {
  const errorAlert = document.createElement('div');
  errorAlert.classList.add('global-error-alert');
  errorAlert.innerHTML = `
    <h2>An error occurred<h2>
    <p><a href="https://github.com/johannesjo/super-productivity/issues/new" target="_blank">Please Report</a></p>
    <pre>${error}</pre>
    `;
  const btnReload = document.createElement('BUTTON');
  btnReload.innerText = 'Reload App';
  btnReload.addEventListener('click', () => {
    window.location.reload();
  });
  errorAlert.append(btnReload);
  document.body.append(errorAlert);
};

@Injectable()
export class CustomErrorHandler implements ErrorHandler {
  constructor(private _snackService: SnackService) {
  }

  handleError(error: any) {
    // if not our custom error handler we have a critical error on our hands
    if (!error || (!error.handledError && (typeof error === 'string' && !error.match(HANDLED_ERROR)))) {
      const errorStr = this._getErrorStr(error);
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
    console.error('GLOBAL_ERROR_HANDLER', error);
    // NOTE: rethrow the error otherwise it gets swallowed
    throw error;
  }

  private _getErrorStr(err: any): string {
    if (isObject(err)) {
      return getJiraResponseErrorTxt(err);
    } else {
      return err.toString();
    }
  }
}

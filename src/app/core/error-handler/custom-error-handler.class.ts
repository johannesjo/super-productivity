import { ErrorHandler, Injectable } from '@angular/core';
import { SnackService } from '../snack/snack.service';

const _createErrorAlert = (error: Error) => {
  const errorAlert = document.createElement('div');
  errorAlert.classList.add('global-error-alert');
  errorAlert.innerHTML = `
    <h2>An error occurred<h2>
    <p><a href="https://github.com/johannesjo/super-productivity/issues/new" target="_blank">Please Report</a></p>
    <pre>${error.toString()}</pre>
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

  handleError(error: Error) {
    // NOTE: snack won't work most of the time
    try {
      this._snackService.open({
        type: 'GLOBAL_ERROR',
        config: {
          // display basically forever
          duration: 60 * 60 * 24 * 1000,
        },
        message: error.toString().substring(0, 150),
      });
    } catch (e) {
      _createErrorAlert(error);
    }
    console.log('GLOBAL_ERROR_HANDLER');
    // NOTE: rethrow the error otherwise it gets swallowed
    throw error;
  }
}

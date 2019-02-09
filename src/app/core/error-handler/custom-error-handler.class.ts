import { ErrorHandler, Injectable } from '@angular/core';
import { SnackService } from '../snack/snack.service';

const _createErrorAlert = (error: Error) => {

};

@Injectable()
export class CustomErrorHandler implements ErrorHandler {
  constructor(private _snackService: SnackService) {
  }

  handleError(error: Error) {
    console.log('CREATE ERRORXXX');
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
    console.error(error);
  }
}

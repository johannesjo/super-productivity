import { ErrorHandler, Injectable } from '@angular/core';
import { SnackService } from '../snack/snack.service';

@Injectable()
export class CustomErrorHandler implements ErrorHandler {
  constructor(private _snackService: SnackService) {
  }

  handleError(error: Error) {
    console.error(error);
    this._snackService.open({
      type: 'ERROR',
      config: {
        // display basically forever
        duration: 60 * 60 * 24 * 1000,
      },
      message: error.toString().substring(0, 150),
    });
  }
}

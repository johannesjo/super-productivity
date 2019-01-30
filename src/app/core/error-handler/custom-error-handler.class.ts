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
      message: error.toString().substring(0, 150),
    });
  }
}

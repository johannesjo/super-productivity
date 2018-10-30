import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { SnackClose, SnackOpen } from './store/snack.actions';
import { SnackParams } from './snack.model';

@Injectable({
  providedIn: 'root'
})
export class SnackService {
  constructor(private _store$: Store<any>) {
  }

  open(params: SnackParams | string) {
    if (typeof params === 'string') {
      params = {message: params};
    }
    this._store$.dispatch(new SnackOpen(params));
  }

  close() {
    this._store$.dispatch(new SnackClose());
  }
}

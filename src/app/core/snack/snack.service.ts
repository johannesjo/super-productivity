import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { SnackClose, SnackOpen } from './store/snack.actions';
import { MatSnackBarConfig } from '@angular/material';

@Injectable({
  providedIn: 'root'
})
export class SnackService {
  constructor(private _store$: Store<any>) {
  }

  open(params: {
    message: string,
    actionStr?: string,
    actionId?: string,
    delay?: number,
    config?: MatSnackBarConfig
  }) {
    this._store$.dispatch(new SnackOpen(params));
  }

  close() {
    this._store$.dispatch(new SnackClose());
  }
}

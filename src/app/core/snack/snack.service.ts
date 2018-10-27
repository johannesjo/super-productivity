import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { SnackClose, SnackOpen } from './store/snack.actions';
import { MatSnackBarConfig } from '@angular/material';

@Injectable({
  providedIn: 'root'
})
export class SnackService {
  constructor(private _store$: Store) {
  }

  open(message: string, action?: string, config?: MatSnackBarConfig) {
    this._store$.dispatch(new SnackOpen({
      message,
      action,
      config,
    }));
  }

  close() {
    this._store$.dispatch(new SnackClose());
  }
}

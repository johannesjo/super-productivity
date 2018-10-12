import { Injectable } from '@angular/core';
import { Actions } from '@ngrx/effects';

@Injectable()
export class ConfigEffects {
  constructor(private actions$: Actions) {
  }
}

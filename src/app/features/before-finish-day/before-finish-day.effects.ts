import { Injectable } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';

@Injectable()
export class BeforeFinishDayEffects {
  constructor(private actions$: Actions) {}
}

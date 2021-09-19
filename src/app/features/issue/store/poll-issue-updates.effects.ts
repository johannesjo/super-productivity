import { Injectable } from '@angular/core';
import { Actions } from '@ngrx/effects';

@Injectable()
export class PollIssueUpdatesEffects {
  constructor(private actions$: Actions) {}
}

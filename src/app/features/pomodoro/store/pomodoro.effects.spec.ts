import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';

import { PomodoroEffects } from './pomodoro.effects';

describe('PomodoroEffects', () => {
  let actions$: Observable<any>;
  let effects: PomodoroEffects;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PomodoroEffects,
        provideMockActions(() => actions$)
      ]
    });

    effects = TestBed.get(PomodoroEffects);
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });
});

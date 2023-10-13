import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';

import { FocusModeEffects } from './focus-mode.effects';

describe('FocusModeEffects', () => {
  let actions$: Observable<any>;
  let effects: FocusModeEffects;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FocusModeEffects, provideMockActions(() => actions$)],
    });

    effects = TestBed.inject(FocusModeEffects);
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });
});

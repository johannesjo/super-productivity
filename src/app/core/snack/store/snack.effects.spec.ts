import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';

import { SnackEffects } from './snack.effects';

describe('SnackEffects', () => {
  let actions$: Observable<any>;
  let effects: SnackEffects;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SnackEffects,
        provideMockActions(() => actions$)
      ]
    });

    effects = TestBed.get(SnackEffects);
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });
});

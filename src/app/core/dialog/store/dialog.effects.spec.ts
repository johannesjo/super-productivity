import { TestBed, inject } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';

import { DialogEffects } from './dialog.effects';

describe('DialogEffects', () => {
  let actions$: Observable<any>;
  let effects: DialogEffects;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DialogEffects,
        provideMockActions(() => actions$)
      ]
    });

    effects = TestBed.get(DialogEffects);
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });
});

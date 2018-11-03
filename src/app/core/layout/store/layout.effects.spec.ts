import { TestBed, inject } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';

import { LayoutEffects } from './layout.effects';

describe('LayoutEffects', () => {
  let actions$: Observable<any>;
  let effects: LayoutEffects;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LayoutEffects,
        provideMockActions(() => actions$)
      ]
    });

    effects = TestBed.get(LayoutEffects);
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });
});

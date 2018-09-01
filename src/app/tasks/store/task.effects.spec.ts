import { TestBed, inject } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';

import { TaskEffects } from './task.effects';

describe('TaskEffects', () => {
  let actions$: Observable<any>;
  let effects: TaskEffects;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TaskEffects,
        provideMockActions(() => actions$)
      ]
    });

    effects = TestBed.get(TaskEffects);
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });
});

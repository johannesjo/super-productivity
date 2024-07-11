import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';

import { WeekPlannerEffects } from './week-planner.effects';

describe('WeekPlannerEffects', () => {
  let actions$: Observable<any>;
  let effects: WeekPlannerEffects;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WeekPlannerEffects, provideMockActions(() => actions$)],
    });

    effects = TestBed.inject(WeekPlannerEffects);
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { TakeABreakService } from './take-a-break.service';

describe('TakeABreakService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TakeABreakService = TestBed.get(TakeABreakService);
    expect(service).toBeTruthy();
  });
});

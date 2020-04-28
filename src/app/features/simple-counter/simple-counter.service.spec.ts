import { TestBed } from '@angular/core/testing';

import { SimpleCounterService } from './simple-counter.service';

describe('SimpleCounterService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SimpleCounterService = TestBed.get(SimpleCounterService);
    expect(service).toBeTruthy();
  });
});

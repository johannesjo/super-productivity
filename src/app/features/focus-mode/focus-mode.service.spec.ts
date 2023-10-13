import { TestBed } from '@angular/core/testing';

import { FocusModeService } from './focus-mode.service';

describe('FocusModeService', () => {
  let service: FocusModeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FocusModeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

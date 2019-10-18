import { TestBed } from '@angular/core/testing';

import { WatermelonService } from './watermelon.service';

describe('WatermelonService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: WatermelonService = TestBed.get(WatermelonService);
    expect(service).toBeTruthy();
  });
});

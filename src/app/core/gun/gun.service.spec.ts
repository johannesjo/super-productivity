import { TestBed } from '@angular/core/testing';

import { GunService } from './gun.service';

describe('GunService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: GunService = TestBed.get(GunService);
    expect(service).toBeTruthy();
  });
});

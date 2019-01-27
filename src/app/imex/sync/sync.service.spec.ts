import { TestBed } from '@angular/core/testing';

import { SyncService } from './sync.service';

describe('SyncService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SyncService = TestBed.get(SyncService);
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { PersistenceService } from './persistence.service';

describe('PersistenceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: PersistenceService = TestBed.get(PersistenceService);
    expect(service).toBeTruthy();
  });
});

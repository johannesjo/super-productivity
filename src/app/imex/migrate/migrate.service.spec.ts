import { TestBed } from '@angular/core/testing';

import { MigrateService } from './migrate.service';

describe('MigrateService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: MigrateService = TestBed.get(MigrateService);
    expect(service).toBeTruthy();
  });
});

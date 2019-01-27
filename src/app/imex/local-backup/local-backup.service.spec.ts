import { TestBed } from '@angular/core/testing';

import { LocalBackupService } from './local-backup.service';

describe('LocalBackupService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: LocalBackupService = TestBed.get(LocalBackupService);
    expect(service).toBeTruthy();
  });
});

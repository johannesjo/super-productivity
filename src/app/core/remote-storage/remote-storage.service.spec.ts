import { TestBed } from '@angular/core/testing';

import { RemoteStorageService } from './remote-storage.service';

describe('RemoteStorageService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: RemoteStorageService = TestBed.get(RemoteStorageService);
    expect(service).toBeTruthy();
  });
});

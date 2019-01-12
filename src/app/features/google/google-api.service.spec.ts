import { TestBed } from '@angular/core/testing';

import { GoogleApiService } from './google-api.service';

describe('GoogleApiService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: GoogleApiService = TestBed.get(GoogleApiService);
    expect(service).toBeTruthy();
  });
});

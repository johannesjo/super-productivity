import { TestBed } from '@angular/core/testing';

import { GitApiService } from './git-api.service';

describe('GitApiService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: GitApiService = TestBed.get(GitApiService);
    expect(service).toBeTruthy();
  });
});

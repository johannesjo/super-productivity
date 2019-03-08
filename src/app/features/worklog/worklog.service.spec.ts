import { TestBed } from '@angular/core/testing';

import { WorklogService } from './worklog.service';

describe('WorklogService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: WorklogService = TestBed.get(WorklogService);
    expect(service).toBeTruthy();
  });
});

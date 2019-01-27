import { TestBed } from '@angular/core/testing';

import { JiraApiService } from './jira-api.service';

describe('JiraApiService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: JiraApiService = TestBed.get(JiraApiService);
    expect(service).toBeTruthy();
  });
});

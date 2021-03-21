import { TestBed } from '@angular/core/testing';

import { ProjectMetricsService } from './project-metrics.service';

describe('ProjectMetricsService', () => {
  let service: ProjectMetricsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectMetricsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

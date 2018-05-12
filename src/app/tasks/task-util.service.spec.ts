import { TestBed, inject } from '@angular/core/testing';

import { TaskUtilService } from './task-util.service';

describe('TaskUtilService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TaskUtilService]
    });
  });

  it('should be created', inject([TaskUtilService], (service: TaskUtilService) => {
    expect(service).toBeTruthy();
  }));
});

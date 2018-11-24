import { TestBed } from '@angular/core/testing';

import { ReminderService } from './reminder.service';

describe('ReminderService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ReminderService = TestBed.get(ReminderService);
    expect(service).toBeTruthy();
  });
});

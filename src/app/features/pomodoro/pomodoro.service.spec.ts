import { TestBed } from '@angular/core/testing';

import { PomodoroService } from './pomodoro.service';

describe('PomodoroService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: PomodoroService = TestBed.get(PomodoroService);
    expect(service).toBeTruthy();
  });
});

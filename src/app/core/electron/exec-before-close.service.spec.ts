import { TestBed } from '@angular/core/testing';

import { ExecBeforeCloseService } from './exec-before-close.service';

describe('ExecBeforeCloseService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ExecBeforeCloseService = TestBed.get(ExecBeforeCloseService);
    expect(service).toBeTruthy();
  });
});

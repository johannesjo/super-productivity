import { TestBed } from '@angular/core/testing';

import { ImexViewService } from './imex-view.service';

describe('ImexViewService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ImexViewService = TestBed.inject(ImexViewService);
    expect(service).toBeTruthy();
  });
});

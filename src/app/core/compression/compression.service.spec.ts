import { TestBed } from '@angular/core/testing';

import { CompressionService } from './compression.service';

describe('CompressionService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: CompressionService = TestBed.get(CompressionService);
    expect(service).toBeTruthy();
  });
});

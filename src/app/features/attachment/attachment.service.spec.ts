import { TestBed } from '@angular/core/testing';

import { AttachmentService } from './attachment.service';

describe('AttachmentService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: AttachmentService = TestBed.get(AttachmentService);
    expect(service).toBeTruthy();
  });
});

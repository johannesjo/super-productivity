import { TestBed } from '@angular/core/testing';

import { NoteService } from './note.service';

describe('NoteService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: NoteService = TestBed.get(NoteService);
    expect(service).toBeTruthy();
  });
});

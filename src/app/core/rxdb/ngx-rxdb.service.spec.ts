import { TestBed } from '@angular/core/testing';

import { NgxRxdbService } from './ngx-rxdb.service';

describe('NgxRxdbService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: NgxRxdbService = TestBed.get(NgxRxdbService);
    expect(service).toBeTruthy();
  });
});

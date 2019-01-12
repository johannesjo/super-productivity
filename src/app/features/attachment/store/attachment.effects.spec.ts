import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';

import { AttachmentEffects } from './attachment.effects';

describe('AttachmentEffects', () => {
  let actions$: Observable<any>;
  let effects: AttachmentEffects;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AttachmentEffects,
        provideMockActions(() => actions$)
      ]
    });

    effects = TestBed.get(AttachmentEffects);
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });
});

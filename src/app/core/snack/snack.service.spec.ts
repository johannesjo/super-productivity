import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { EMPTY } from 'rxjs';
import { LOCAL_ACTIONS } from '../../util/local-actions.token';
import { SnackParams } from './snack.model';
import { SnackService } from './snack.service';

describe('SnackService', () => {
  let service: SnackService;
  let openSnackSpy: jasmine.Spy<(params: SnackParams) => void>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SnackService,
        { provide: Store, useValue: { dispatch: jasmine.createSpy('dispatch') } },
        {
          provide: TranslateService,
          useValue: { instant: (value: string): string => value },
        },
        { provide: LOCAL_ACTIONS, useValue: EMPTY },
        { provide: MatSnackBar, useValue: {} },
      ],
    });
    service = TestBed.inject(SnackService);
    openSnackSpy = spyOn(
      service as unknown as { _openSnack: (params: SnackParams) => void },
      '_openSnack',
    );
  });

  it('should not let an ordinary snack replace a persistent recovery action', () => {
    service.open({
      msg: 'Recovery available',
      actionStr: 'Undo',
      config: { duration: 0 },
    });

    service.open({ msg: 'Sync complete', type: 'SUCCESS' });
    service.open('Another ordinary message');

    expect(openSnackSpy).toHaveBeenCalledTimes(1);
    expect(service.hasPendingPersistentAction()).toBeTrue();
  });

  it('should allow a newer persistent action to replace the current one', () => {
    service.open({
      msg: 'Recovery available',
      actionStr: 'Undo',
      config: { duration: 0 },
    });
    service.open({
      msg: 'Update required',
      actionStr: 'Update',
      config: { duration: 0 },
    });

    expect(openSnackSpy).toHaveBeenCalledTimes(2);
  });

  it('should accept ordinary snacks after the persistent action is closed', () => {
    service.open({
      msg: 'Recovery available',
      actionStr: 'Undo',
      config: { duration: 0 },
    });
    service.close();

    service.open({ msg: 'Restore complete', type: 'SUCCESS' });

    expect(openSnackSpy).toHaveBeenCalledTimes(2);
    expect(service.hasPendingPersistentAction()).toBeFalse();
  });
});

import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import { shareReplay, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DataInitStateService {
  public readonly _neverUpdateOutsideDataInitService$ = new ReplaySubject<boolean>();

  public readonly isAllDataLoadedInitially$: Observable<boolean> =
    this._neverUpdateOutsideDataInitService$.pipe(
      take(1),
      // only ever load once
      shareReplay(1),
    );
}

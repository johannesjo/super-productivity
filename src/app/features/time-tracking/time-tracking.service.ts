import { inject, Injectable } from '@angular/core';
import { combineLatest, Observable, Subject } from 'rxjs';
import { TimeTrackingState, TTDateMap, TTWorkContextData } from './time-tracking.model';
import { first, map, shareReplay, switchMap, startWith } from 'rxjs/operators';
import { mergeTimeTrackingStates } from './merge-time-tracking-states';
import { Store } from '@ngrx/store';
import { selectTimeTrackingState } from './store/time-tracking.selectors';
import { PfapiService } from '../../pfapi/pfapi.service';
import { WorkContextType, WorkStartEnd } from '../work-context/work-context.model';
import { ImpossibleError } from '../../pfapi/api';
import { toLegacyWorkStartEndMaps } from './to-legacy-work-start-end-maps';

@Injectable({
  providedIn: 'root',
})
export class TimeTrackingService {
  private _store = inject(Store);
  private _pfapiService = inject(PfapiService);

  private _archiveUpdateTrigger$ = new Subject();
  private _archiveOldUpdateTrigger$ = new Subject();

  current$: Observable<TimeTrackingState> = this._store.select(selectTimeTrackingState);
  archive$: Observable<TimeTrackingState> = this._archiveUpdateTrigger$.pipe(
    startWith(null),
    switchMap(async () => {
      return (await this._pfapiService.m.archive.load()).timeTracking;
    }),
    shareReplay(1),
  );

  archiveOld$: Observable<TimeTrackingState> = this._archiveOldUpdateTrigger$.pipe(
    startWith(null),
    switchMap(async () => {
      return (await this._pfapiService.m.archiveOld.load()).timeTracking;
    }),
    shareReplay(1),
  );

  state$: Observable<TimeTrackingState> = combineLatest([
    this.current$,
    this.archive$,
    this.archiveOld$,
  ]).pipe(
    map(([current, archive, oldArchive]) =>
      mergeTimeTrackingStates({ current, archive, oldArchive }),
    ),
    shareReplay(1),
  );

  getWorkStartEndForWorkContext$(ctx: {
    id: string;
    type: WorkContextType;
  }): Observable<TTDateMap<TTWorkContextData>> {
    const { id, type } = ctx;
    return this.state$.pipe(
      map((state) => {
        if (type === 'PROJECT') {
          return state.project[id] || ({} as TTDateMap<TTWorkContextData>);
        }
        if (type === 'TAG') {
          return state.tag[id] || ({} as TTDateMap<TTWorkContextData>);
        }
        throw new ImpossibleError('Invalid work context type ' + type);
      }),
    );
  }

  async getWorkStartEndForWorkContext(ctx: {
    id: string;
    type: WorkContextType;
  }): Promise<TTDateMap<TTWorkContextData>> {
    return this.getWorkStartEndForWorkContext$(ctx).pipe(first()).toPromise();
  }

  async getLegacyWorkStartEndForWorkContext(ctx: {
    id: string;
    type: WorkContextType;
  }): Promise<{
    workStart: WorkStartEnd;
    workEnd: WorkStartEnd;
  }> {
    const d = await this.getWorkStartEndForWorkContext(ctx);
    return toLegacyWorkStartEndMaps(d);
  }
}

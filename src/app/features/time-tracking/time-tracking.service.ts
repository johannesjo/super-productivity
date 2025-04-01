import { inject, Injectable } from '@angular/core';
import { combineLatest, EMPTY, Observable, Subject } from 'rxjs';
import { TimeTrackingState, TTDateMap, TTWorkContextData } from './time-tracking.model';
import { first, map, switchMap } from 'rxjs/operators';
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
  private _oldArchiveUpdateTrigger$ = new Subject();

  // todo this.store.select(selectTimeTrackingState) is not working
  current$: Observable<TimeTrackingState> = this._store.select(selectTimeTrackingState);
  archive$: Observable<TimeTrackingState> = this._archiveUpdateTrigger$.pipe(
    switchMap(() => {
      return EMPTY;
      // return this._pfapiService.m.timeTrackingArchive;
    }),
  );
  oldArchive$: Observable<TimeTrackingState> = this._oldArchiveUpdateTrigger$.pipe(
    switchMap(() => {
      return EMPTY;
      // return this._pfapiService.m.timeTrackingOldArchive;
    }),
  );

  state$: Observable<TimeTrackingState> = combineLatest([
    this.current$,
    this.archive$,
    this.oldArchive$,
  ]).pipe(
    map(([current, archive, oldArchive]) =>
      mergeTimeTrackingStates({ current, archive, oldArchive }),
    ),
  );

  constructor() {}

  async getWorkStartEndForWorkContext(ctx: {
    id: string;
    type: WorkContextType;
  }): Promise<TTDateMap<TTWorkContextData>> {
    const { id, type } = ctx;
    const state = await this.state$.pipe(first()).toPromise();
    if (type === 'PROJECT') {
      return state.project[id] || ({} as TTDateMap<TTWorkContextData>);
    }
    if (type === 'TAG') {
      return state.tag[id] || ({} as TTDateMap<TTWorkContextData>);
    }
    throw new ImpossibleError('Invalid work context type ' + type);
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

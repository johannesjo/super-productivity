import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  catchError,
  distinctUntilChanged,
  first,
  map,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs/operators';
import { getRelevantEventsForCalendarIntegrationFromIcal } from '../schedule/ical/get-relevant-events-from-ical';
import {
  BehaviorSubject,
  combineLatest,
  defer,
  forkJoin,
  merge,
  Observable,
  of,
} from 'rxjs';
import { T } from '../../t.const';
import { SnackService } from '../../core/snack/snack.service';
import { getStartOfDayTimestamp } from '../../util/get-start-of-day-timestamp';
import { getEndOfDayTimestamp } from '../../util/get-end-of-day-timestamp';
import { CalendarIntegrationEvent } from './calendar-integration.model';
import { fastArrayCompare } from '../../util/fast-array-compare';
import { selectAllCalendarTaskEventIds } from '../tasks/store/task.selectors';
import { loadFromRealLs, saveToRealLs } from '../../core/persistence/local-storage';
import { LS } from '../../core/persistence/storage-keys.const';
import { Store } from '@ngrx/store';
import { ScheduleCalendarMapEntry } from '../schedule/schedule.model';
import { getDbDateStr } from '../../util/get-db-date-str';
import { selectCalendarProviders } from '../issue/store/issue-provider.selectors';
import { IssueProviderCalendar } from '../issue/issue.model';
import { CalendarProviderCfg } from '../issue/providers/calendar/calendar.model';
import { CORS_SKIP_EXTRA_HEADERS } from '../../app.constants';
import { Log } from '../../core/log';

const ONE_MONTHS = 60 * 60 * 1000 * 24 * 31;

@Injectable({
  providedIn: 'root',
})
export class CalendarIntegrationService {
  private _http = inject(HttpClient);
  private _snackService = inject(SnackService);
  private _store = inject(Store);

  icalEvents$: Observable<ScheduleCalendarMapEntry[]> = merge(
    // NOTE: we're using this rather than startWith since we want to use the freshest available cached value
    defer(() => of(this._getCalProviderFromCache())),
    this._store.select(selectCalendarProviders).pipe(
      distinctUntilChanged(fastArrayCompare),
      switchMap((calendarProviders) => {
        return calendarProviders && calendarProviders.length
          ? forkJoin(
              calendarProviders.map((calProvider) => {
                if (!calProvider.isEnabled) {
                  return of({ itemsForProvider: [], calProvider });
                }

                return this.requestEventsForSchedule$(calProvider).pipe(
                  first(),
                  map((itemsForProvider: CalendarIntegrationEvent[]) => ({
                    itemsForProvider,
                    calProvider,
                  })),
                );
              }),
            ).pipe(
              switchMap((resultForProviders) =>
                combineLatest([
                  this._store
                    .select(selectAllCalendarTaskEventIds)
                    .pipe(distinctUntilChanged(fastArrayCompare)),
                  this.skippedEventIds$.pipe(distinctUntilChanged(fastArrayCompare)),
                ]).pipe(
                  // tap((val) => Log.log('selectAllCalendarTaskEventIds', val)),
                  map(([allCalendarTaskEventIds, skippedEventIds]) => {
                    return resultForProviders.map(({ itemsForProvider, calProvider }) => {
                      return {
                        //   // filter out items already added as tasks
                        items: itemsForProvider.filter(
                          (calEv) =>
                            !allCalendarTaskEventIds.includes(calEv.id) &&
                            !skippedEventIds.includes(calEv.id),
                        ),
                      } as ScheduleCalendarMapEntry;
                    });
                  }),
                ),
              ),
              // tap((v) => Log.log('icalEvents$ final', v)),
              tap((val) => {
                saveToRealLs(LS.CAL_EVENTS_CACHE, val);
              }),
            )
          : (of([]) as Observable<ScheduleCalendarMapEntry[]>);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    ),
  );

  public readonly skippedEventIds$ = new BehaviorSubject<string[]>([]);

  constructor() {
    // Log.log(
    //   localStorage.getItem(LS.CALENDER_EVENTS_LAST_SKIP_DAY),
    //   localStorage.getItem(LS.CALENDER_EVENTS_SKIPPED_TODAY),
    //   localStorage.getItem(LS.CAL_EVENTS_CACHE),
    // );

    if (localStorage.getItem(LS.CALENDER_EVENTS_LAST_SKIP_DAY) === getDbDateStr()) {
      try {
        const skippedEvIds = JSON.parse(
          localStorage.getItem(LS.CALENDER_EVENTS_SKIPPED_TODAY) as string,
        );
        this.skippedEventIds$.next(skippedEvIds || []);
      } catch (e) {}
    }
  }

  testConnection(cfg: CalendarProviderCfg): Promise<boolean> {
    //  simple http get request
    return this._http
      .get(cfg.icalUrl, {
        responseType: 'text',
        headers: {
          ...CORS_SKIP_EXTRA_HEADERS,
        },
      })
      .pipe(
        map((v) => !!v),
        catchError((err) => {
          Log.err(err);
          return of(false);
        }),
      )
      .toPromise()
      .then((result) => result ?? false);
  }

  skipCalendarEvent(evId: string): void {
    this.skippedEventIds$.next([...this.skippedEventIds$.getValue(), evId]);
    localStorage.setItem(
      LS.CALENDER_EVENTS_SKIPPED_TODAY,
      JSON.stringify(this.skippedEventIds$.getValue()),
    );
    localStorage.setItem(LS.CALENDER_EVENTS_LAST_SKIP_DAY, getDbDateStr());
  }

  requestEvents$(
    calProvider: IssueProviderCalendar,
    start = getStartOfDayTimestamp(),
    end = getEndOfDayTimestamp(),
    isForwardError = false,
  ): Observable<CalendarIntegrationEvent[]> {
    // Log.log('REQUEST EVENTS', calProvider, start, end);

    return this._http
      .get(calProvider.icalUrl, {
        responseType: 'text',
        headers: {
          ...CORS_SKIP_EXTRA_HEADERS,
        },
      })
      .pipe(
        map((icalStrData) =>
          getRelevantEventsForCalendarIntegrationFromIcal(
            icalStrData,
            calProvider.id,
            start,
            end,
          ),
        ),
        catchError((err) => {
          Log.err(err);
          this._snackService.open({
            type: 'ERROR',
            msg: T.F.CALENDARS.S.CAL_PROVIDER_ERROR,
            translateParams: {
              errTxt: err?.toString() || err?.status || err?.message || 'UNKNOWN :(',
            },
          });
          if (isForwardError) {
            throw new Error(err);
          }
          return of([]);
        }),
      );
  }

  requestEventsForSchedule$(
    calProvider: IssueProviderCalendar,
    isForwardError = false,
  ): Observable<CalendarIntegrationEvent[]> {
    return this.requestEvents$(
      calProvider,
      Date.now(),
      Date.now() + ONE_MONTHS,
      isForwardError,
    );
  }

  private _getCalProviderFromCache(): ScheduleCalendarMapEntry[] {
    const now = Date.now();
    return (
      ((loadFromRealLs(LS.CAL_EVENTS_CACHE) as ScheduleCalendarMapEntry[]) || [])
        // filter out cached past entries
        .map((provider) => ({
          ...provider,
          items: provider.items.filter((item) => item.start + item.duration >= now),
        }))
    );
  }
}

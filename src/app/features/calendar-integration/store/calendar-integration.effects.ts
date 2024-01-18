import { Inject, Injectable, LOCALE_ID } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { selectCalendarProviders } from '../../config/store/global-config.reducer';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { EMPTY, forkJoin, of, timer } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { getRelevantEventsForCalendarIntegrationFromIcal } from '../../timeline/ical/get-relevant-events-from-ical';
import { getEndOfDayTimestamp } from '../../../util/get-end-of-day-timestamp';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { BannerService } from '../../../core/banner/banner.service';
import { DatePipe } from '@angular/common';
import { CalendarProvider } from '../../config/global-config.model';
import { CalendarIntegrationEvent } from '../calendar-integration.model';
import { getStartOfDayTimestamp } from '../../../util/get-start-of-day-timestamp';
import { TaskService } from '../../tasks/task.service';
import { isCalenderEventDue } from '../is-calender-event-due';

const CHECK_TO_SHOW_INTERVAL = 6 * 1000;

@Injectable()
export class CalendarIntegrationEffects {
  pollChanges$ = createEffect(
    () =>
      this._globalTrackingIntervalService.todayDateStr$.pipe(
        switchMap(() => this._store.select(selectCalendarProviders)),
        switchMap((calProviders) => {
          const activatedProviders = calProviders.filter(
            (calProvider) => calProvider.isEnabled && calProvider.icalUrl,
          );
          if (!activatedProviders.length) {
            return EMPTY;
          }
          const now = Date.now();
          // const startTS = now - START_OFFSET;

          return forkJoin(
            activatedProviders.map((calProvider) =>
              timer(0, calProvider.checkUpdatesEvery).pipe(
                // timer(0, 10000).pipe(
                tap(() => console.log('REQUEST CALENDAR', calProvider)),
                switchMap(() =>
                  this._http.get(calProvider.icalUrl, { responseType: 'text' }),
                ),
                map((icalStrData) => {
                  // allEventsToday
                  return getRelevantEventsForCalendarIntegrationFromIcal(
                    icalStrData,
                    getStartOfDayTimestamp(),
                    getEndOfDayTimestamp(),
                  );
                }),
                catchError((err) => {
                  console.error(err);
                  // TODO show error snack
                  return of([]);
                }),
                switchMap((allEventsToday) =>
                  timer(0, CHECK_TO_SHOW_INTERVAL).pipe(
                    tap((t) => console.log('________', t, allEventsToday)),
                    tap(() => {
                      const eventsToShowBannerFor = allEventsToday.filter((calEv) =>
                        isCalenderEventDue(
                          calEv,
                          calProvider,
                          this._skippedEventIds,
                          now,
                        ),
                      );
                      console.log({ eventsToShowBannerFor });

                      eventsToShowBannerFor.forEach((calEv) =>
                        this._showBanner(calEv, calProvider),
                      );
                    }),
                  ),
                ),
              ),
            ),
          );
        }),
        tap((a) => console.log('_____END___', a)),
      ),
    { dispatch: false },
  );

  private _skippedEventIds: string[] = [];
  private _currentlyShownBanners: string[] = [];

  constructor(
    private _actions$: Actions,
    private _store: Store,
    private _http: HttpClient,
    private _globalTrackingIntervalService: GlobalTrackingIntervalService,
    private _bannerService: BannerService,
    private _datePipe: DatePipe,
    private _taskService: TaskService,
    @Inject(LOCALE_ID) private locale: string,
  ) {}

  private _showBanner(
    calEv: CalendarIntegrationEvent,
    calProvider: CalendarProvider,
  ): void {
    const start = this._datePipe.transform(calEv.start, 'shortTime');
    const startShortSyntax = this._datePipe.transform(calEv.start, 'H:mm');
    const durationInMin = Math.round(calEv.duration / 60 / 1000);

    if (!this._currentlyShownBanners.includes(calEv.id)) {
      this._currentlyShownBanners.push(calEv.id);
    }
    const nrOfOtherBanners = this._currentlyShownBanners.length;
    console.log(this._currentlyShownBanners);

    this._bannerService.open({
      id: calEv.id,
      ico: calProvider.icon || undefined,
      msg: `<strong>${calEv.title}</strong> starts at <strong>${start}</strong>!${
        nrOfOtherBanners > 1
          ? `<br> (and ${nrOfOtherBanners - 1} other events are due)`
          : ''
      }`,
      action: {
        label: 'Dismiss',
        fn: () => {
          this._currentlyShownBanners = this._currentlyShownBanners.filter(
            (evId) => evId !== calEv.id,
          );
          this._skippedEventIds.push(calEv.id);
        },
      },
      action2: {
        label: 'Add as Task',
        fn: () => {
          this._currentlyShownBanners = this._currentlyShownBanners.filter(
            (evId) => evId !== calEv.id,
          );
          this._skippedEventIds.push(calEv.id);
          this._taskService.add(
            `${calEv.title} @${startShortSyntax} ${durationInMin}m`,
            undefined,
            {
              projectId: calProvider.defaultProjectId,
              issueId: calEv.id,
              issueType: 'CALENDAR',
            },
          );
        },
      },
    });
  }
}

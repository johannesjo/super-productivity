import { Inject, Injectable, LOCALE_ID } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { selectCalendarProviders } from '../../config/store/global-config.reducer';
import { switchMap, tap } from 'rxjs/operators';
import { EMPTY, forkJoin, timer } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { BannerService } from '../../../core/banner/banner.service';
import { DatePipe } from '@angular/common';
import { CalendarProvider } from '../../config/global-config.model';
import { CalendarIntegrationEvent } from '../calendar-integration.model';
import { TaskService } from '../../tasks/task.service';
import { isCalenderEventDue } from '../is-calender-event-due';
import { CalendarIntegrationService } from '../calendar-integration.service';
import { LS } from '../../../core/persistence/storage-keys.const';
import { getWorklogStr } from '../../../util/get-work-log-str';

const CHECK_TO_SHOW_INTERVAL = 60 * 1000;

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
                  this._calendarIntegrationService.requestEvents(calProvider),
                ),
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

  private readonly _skippedEventIds: string[] = [];
  private _currentlyShownBanners: string[] = [];

  constructor(
    private _actions$: Actions,
    private _store: Store,
    private _http: HttpClient,
    private _globalTrackingIntervalService: GlobalTrackingIntervalService,
    private _bannerService: BannerService,
    private _datePipe: DatePipe,
    private _taskService: TaskService,
    private _calendarIntegrationService: CalendarIntegrationService,
    @Inject(LOCALE_ID) private locale: string,
  ) {
    if (localStorage.getItem(LS.CALENDER_EVENTS_LAST_SKIP_DAY) === getWorklogStr()) {
      try {
        const skippedEvIds = JSON.parse(
          localStorage.getItem(LS.CALENDER_EVENTS_SKIPPED_TODAY) as string,
        );
        this._skippedEventIds = skippedEvIds;
      } catch (e) {}
    }
    this._skippedEventIds = [];
  }

  private _skipEv(evId: string): void {
    this._skippedEventIds.push(evId);
    localStorage.setItem(
      LS.CALENDER_EVENTS_SKIPPED_TODAY,
      JSON.stringify(this._skippedEventIds),
    );
    localStorage.setItem(LS.CALENDER_EVENTS_LAST_SKIP_DAY, getWorklogStr());
  }

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
          this._skipEv(calEv.id);
        },
      },
      action2: {
        label: 'Add as Task',
        fn: () => {
          this._currentlyShownBanners = this._currentlyShownBanners.filter(
            (evId) => evId !== calEv.id,
          );
          this._skipEv(calEv.id);
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

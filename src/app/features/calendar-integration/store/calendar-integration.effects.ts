import { Inject, Injectable, LOCALE_ID } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { selectCalendarProviders } from '../../config/store/global-config.reducer';
import { distinctUntilChanged, first, map, switchMap, tap } from 'rxjs/operators';
import { BehaviorSubject, EMPTY, forkJoin, timer } from 'rxjs';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { BannerService } from '../../../core/banner/banner.service';
import { DatePipe } from '@angular/common';
import { CalendarProvider } from '../../config/global-config.model';
import { CalendarIntegrationEvent } from '../calendar-integration.model';
import { TaskService } from '../../tasks/task.service';
import { isCalenderEventDue } from '../is-calender-event-due';
import { CalendarIntegrationService } from '../calendar-integration.service';
import { BannerId } from '../../../core/banner/banner.model';
import { selectTaskByIssueId } from '../../tasks/store/task.selectors';
import { NavigateToTaskService } from '../../../core-ui/navigate-to-task/navigate-to-task.service';
import { T } from '../../../t.const';
import { isValidUrl } from '../../../util/is-valid-url';
import { distinctUntilChangedObject } from '../../../util/distinct-until-changed-object';

const CHECK_TO_SHOW_INTERVAL = 60 * 1000;

@Injectable()
export class CalendarIntegrationEffects {
  pollChanges$ = createEffect(
    () =>
      this._globalTrackingIntervalService.todayDateStr$.pipe(
        switchMap(() => this._store.select(selectCalendarProviders)),
        map((calProviders) => {
          return calProviders.filter(
            (calProvider) =>
              calProvider.isEnabled &&
              calProvider.icalUrl &&
              isValidUrl(calProvider.icalUrl),
          );
        }),
        distinctUntilChanged(distinctUntilChangedObject),
        switchMap((activatedProviders) => {
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
                  this._calendarIntegrationService.requestEvents$(calProvider),
                ),
                switchMap((allEventsToday) =>
                  timer(0, CHECK_TO_SHOW_INTERVAL).pipe(
                    tap(() => {
                      const eventsToShowBannerFor = allEventsToday.filter((calEv) =>
                        isCalenderEventDue(
                          calEv,
                          calProvider,
                          this._calendarIntegrationService.skippedEventIds$.getValue(),
                          now,
                        ),
                      );
                      eventsToShowBannerFor.forEach((calEv) => {
                        this._addEvToShow(calEv, calProvider);
                      });
                      // this._showBanner(calEv, calProvider),
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

  private _currentlyShownBanners$ = new BehaviorSubject<
    { id: string; calEv: CalendarIntegrationEvent; calProvider: CalendarProvider }[]
  >([]);
  showBanner = createEffect(
    () =>
      this._currentlyShownBanners$.pipe(
        tap((v) => console.log('this._currentlyShownBanners$', v)),
        tap((v) => this._showBanner(v)),
      ),
    {
      dispatch: false,
    },
  );

  constructor(
    private _store: Store,
    private _globalTrackingIntervalService: GlobalTrackingIntervalService,
    private _bannerService: BannerService,
    private _datePipe: DatePipe,
    private _taskService: TaskService,
    private _calendarIntegrationService: CalendarIntegrationService,
    private _navigateToTaskService: NavigateToTaskService,
    @Inject(LOCALE_ID) private locale: string,
  ) {}

  private _addEvToShow(
    calEv: CalendarIntegrationEvent,
    calProvider: CalendarProvider,
  ): void {
    const curVal = this._currentlyShownBanners$.getValue();
    console.log('addEvToShow', curVal, calEv);
    if (!curVal.map((val) => val.id).includes(calEv.id)) {
      const newBanners = [...curVal, { id: calEv.id, calEv, calProvider }];
      newBanners.sort((a, b) => a.calEv.start - b.calEv.start);
      console.log('UDATE _currentlyShownBanners$');

      this._currentlyShownBanners$.next(newBanners);
    }
  }

  private _skipEv(evId: string): void {
    this._calendarIntegrationService.skipCalendarEvent(evId);
    this._currentlyShownBanners$.next(
      this._currentlyShownBanners$.getValue().filter((v) => v.id !== evId),
    );
  }

  private async _showBanner(
    allEvsToShow: {
      id: string;
      calEv: CalendarIntegrationEvent;
      calProvider: CalendarProvider;
    }[],
  ): Promise<void> {
    console.log('SHOW BANNER');

    const firstEntry = allEvsToShow[0];
    if (!firstEntry) {
      this._bannerService.dismiss(BannerId.CalendarEvent);
      return;
    }
    const { calEv, calProvider } = firstEntry;
    const taskForEvent = await this._store
      .select(selectTaskByIssueId, { issueId: calEv.id })
      .pipe(first())
      .toPromise();

    const start = this._datePipe.transform(calEv.start, 'shortTime') as string;
    const isInPast = calEv.start < Date.now();

    const nrOfAllBanners = allEvsToShow.length;
    console.log({ taskForEvent, allEvsToShow });

    this._bannerService.open({
      id: BannerId.CalendarEvent,
      ico: calProvider.icon || 'event',
      msg: isInPast
        ? nrOfAllBanners > 1
          ? T.F.CALENDARS.BANNER.TXT_PAST_MULTIPLE
          : T.F.CALENDARS.BANNER.TXT_PAST
        : nrOfAllBanners > 1
          ? T.F.CALENDARS.BANNER.TXT_MULTIPLE
          : T.F.CALENDARS.BANNER.TXT,
      translateParams: {
        title: calEv.title,
        start,
        nrOfOtherBanners: nrOfAllBanners - 1,
      },
      action: {
        label: T.G.DISMISS,
        fn: () => {
          this._skipEv(calEv.id);
        },
      },
      action2: taskForEvent
        ? {
            label: T.F.CALENDARS.BANNER.FOCUS_TASK,
            fn: () => {
              this._skipEv(calEv.id);
              this._navigateToTaskService.navigate(taskForEvent.id);
            },
          }
        : {
            label: T.F.CALENDARS.BANNER.ADD_AS_TASK,
            fn: () => {
              this._skipEv(calEv.id);
              this._taskService.addAndSchedule(
                calEv.title,
                {
                  projectId: calProvider.defaultProjectId,
                  issueId: calEv.id,
                  issueProviderId: calProvider.id,
                  issueType: 'CALENDAR',
                  timeEstimate: calEv.duration,
                },
                calEv.start,
              );
            },
          },
    });
  }
}

import { Inject, Injectable, LOCALE_ID } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { selectCalendarProviders } from '../../config/store/global-config.reducer';
import { map, switchMap, tap } from 'rxjs/operators';
import { EMPTY, forkJoin } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { getRelevantEventsForCalendarIntegrationFromIcal } from '../../timeline/ical/get-relevant-events-from-ical';
import { getEndOfDayTimestamp } from '../../../util/get-end-of-day-timestamp';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { BannerId } from '../../../core/banner/banner.model';
import { BannerService } from '../../../core/banner/banner.service';
import { TimelineFromCalendarEvent } from '../../timeline/timeline.model';
import { DatePipe } from '@angular/common';
import { CalendarProvider } from '../../config/global-config.model';
import { CalendarIntegrationEvent } from '../calendar-integration.model';

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
          return forkJoin(
            activatedProviders.map((calProvider) =>
              this._http.get(calProvider.icalUrl, { responseType: 'text' }).pipe(
                map((icalStrData) =>
                  getRelevantEventsForCalendarIntegrationFromIcal(
                    icalStrData,
                    getEndOfDayTimestamp(),
                  ),
                ),
                tap((calEvs) => console.log('________', calEvs)),
                tap((calEvs) =>
                  calEvs.forEach((calEv) => this._showBanner(calEv, calProvider)),
                ),
              ),
            ),
          );
        }),
      ),
    { dispatch: false },
  );

  constructor(
    private _actions$: Actions,
    private _store: Store,
    private _http: HttpClient,
    private _globalTrackingIntervalService: GlobalTrackingIntervalService,
    private _bannerService: BannerService,
    private _datePipe: DatePipe,
    @Inject(LOCALE_ID) private locale: string,
  ) {}

  private _showBanner(
    calEv: CalendarIntegrationEvent,
    calProvider: CalendarProvider,
  ): void {
    const start = this._datePipe.transform(calEv.start, 'shortTime');
    this._bannerService.open({
      id: calEv.id,
      ico: calProvider.icon || undefined,
      msg: `<strong>${calEv.title}</strong> starts at <strong>${start}</strong>!`,
      action: {
        label: 'Add as Task',
        fn: () => undefined,
      },
    });
  }
}

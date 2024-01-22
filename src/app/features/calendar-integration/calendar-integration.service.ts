import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { getRelevantEventsForCalendarIntegrationFromIcal } from '../timeline/ical/get-relevant-events-from-ical';
import { CalendarProvider } from '../config/global-config.model';
import { Observable, of } from 'rxjs';
import { T } from '../../t.const';
import { SnackService } from '../../core/snack/snack.service';
import { getStartOfDayTimestamp } from '../../util/get-start-of-day-timestamp';
import { getEndOfDayTimestamp } from '../../util/get-end-of-day-timestamp';
import { CalendarIntegrationEvent } from './calendar-integration.model';

const TWO_MONTHS = 60 * 60 * 1000 * 24 * 62;

@Injectable({
  providedIn: 'root',
})
export class CalendarIntegrationService {
  constructor(private _http: HttpClient, private _snackService: SnackService) {}

  requestEventsForTimeline(
    calProvider: CalendarProvider,
  ): Observable<CalendarIntegrationEvent[]> {
    return this.requestEvents(calProvider, Date.now(), Date.now() + TWO_MONTHS);
  }

  requestEvents(
    calProvider: CalendarProvider,
    start = getStartOfDayTimestamp(),
    end = getEndOfDayTimestamp(),
  ): Observable<CalendarIntegrationEvent[]> {
    return this._http.get(calProvider.icalUrl, { responseType: 'text' }).pipe(
      map((icalStrData) =>
        getRelevantEventsForCalendarIntegrationFromIcal(icalStrData, start, end),
      ),
      catchError((err) => {
        console.error(err);
        this._snackService.open({
          type: 'ERROR',
          msg: T.F.CALENDARS.S.CAL_PROVIDER_ERROR,
          translateParams: {
            errTxt: err?.toString() || err?.status || err?.message || 'UNKNOWN :(',
          },
        });
        return of([]);
      }),
    );
  }
}

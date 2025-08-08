import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { isToday } from '../../util/is-today.util';
import { ShortTimeHtmlPipe } from './short-time-html.pipe';
import { formatMonthDay } from '../../util/format-month-day.util';
import { DateTimeFormatService } from '../../core/date-time-format/date-time-format.service';

@Pipe({ name: 'shortPlannedAt', standalone: true })
export class ShortPlannedAtPipe implements PipeTransform {
  private _shortTimeHtmlPipe = inject(ShortTimeHtmlPipe);
  private _dateTimeFormatService = inject(DateTimeFormatService);
  private _defaultLocale = inject(LOCALE_ID);

  transform(value?: number | null, timeOnly?: boolean): string | null {
    if (typeof value !== 'number') {
      return null;
    }

    if (isToday(value) || timeOnly) {
      return this._shortTimeHtmlPipe.transform(value);
    } else {
      // Use the configured locale if available, otherwise fall back to default
      const locale = this._dateTimeFormatService.currentLocale || this._defaultLocale;
      return formatMonthDay(new Date(value), locale);
    }
  }
}

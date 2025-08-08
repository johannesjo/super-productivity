import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { isDBDateStr } from '../../util/get-db-date-str';
import { dateStrToUtcDate } from '../../util/date-str-to-utc-date';
import { formatMonthDay } from '../../util/format-month-day.util';
import { DateTimeFormatService } from '../../core/date-time-format/date-time-format.service';

@Pipe({ name: 'shortDate2' })
export class ShortDate2Pipe implements PipeTransform {
  private _dateTimeFormatService = inject(DateTimeFormatService);
  private _defaultLocale = inject(LOCALE_ID);

  transform(value?: number | string | null, ...args: unknown[]): string | null {
    if (typeof value !== 'number' && typeof value !== 'string') {
      return null;
    }

    const date =
      typeof value === 'string' && isDBDateStr(value)
        ? dateStrToUtcDate(value)
        : new Date(value);

    // Use the configured locale if available, otherwise fall back to default
    const locale = this._dateTimeFormatService.currentLocale || this._defaultLocale;
    return formatMonthDay(date, locale);
  }
}

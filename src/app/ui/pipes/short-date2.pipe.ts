import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { isWorklogStr } from '../../util/get-work-log-str';
import { dateStrToUtcDate } from '../../util/date-str-to-utc-date';
import { formatMonthDay } from '../../util/format-month-day.util';

@Pipe({ name: 'shortDate2' })
export class ShortDate2Pipe implements PipeTransform {
  private locale = inject(LOCALE_ID);

  transform(value: number | string | null, ...args: unknown[]): string | null {
    if (typeof value !== 'number' && typeof value !== 'string') {
      return null;
    }

    const date =
      typeof value === 'string' && isWorklogStr(value)
        ? dateStrToUtcDate(value)
        : new Date(value);

    return formatMonthDay(date, this.locale);
  }
}

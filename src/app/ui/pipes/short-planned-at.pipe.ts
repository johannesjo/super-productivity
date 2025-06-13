import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { isToday } from '../../util/is-today.util';
import { ShortTime2Pipe } from './short-time2.pipe';
import { formatMonthDay } from '../../util/format-month-day.util';

@Pipe({ name: 'shortPlannedAt', standalone: true })
export class ShortPlannedAtPipe implements PipeTransform {
  private _shortTime2Pipe = inject(ShortTime2Pipe);
  private locale = inject(LOCALE_ID);

  transform(value?: number | null, ...args: unknown[]): string | null {
    if (typeof value !== 'number') {
      return null;
    }

    if (isToday(value) || args[0] === 'timeOnly') {
      return this._shortTime2Pipe.transform(value, ...args);
    } else {
      return formatMonthDay(new Date(value), this.locale);
    }
  }
}

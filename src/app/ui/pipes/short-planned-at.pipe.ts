import { Inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { isToday } from '../../util/is-today.util';
import { ShortTime2Pipe } from './short-time2.pipe';

@Pipe({
  name: 'shortPlannedAt',
  standalone: false,
})
export class ShortPlannedAtPipe implements PipeTransform {
  constructor(
    private _shortTime2Pipe: ShortTime2Pipe,
    @Inject(LOCALE_ID) private locale: string,
  ) {}

  transform(value: number | null, ...args: unknown[]): string | null {
    if (typeof value !== 'number') {
      return null;
    }

    const locale = this.locale;

    if (isToday(value) || args[0] === 'timeOnly') {
      return this._shortTime2Pipe.transform(value, ...args);
    } else {
      const str = `${new Date(value).toLocaleDateString(locale, {
        month: 'numeric',
        day: 'numeric',
      })}`;

      const lastChar = str.slice(-1);

      if (isNaN(lastChar as any)) {
        return str.slice(0, -1);
      }
      return str;
    }
  }
}

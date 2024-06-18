import { Inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';
import { isToday } from '../../util/is-today.util';

@Pipe({
  name: 'shortPlannedAt',
})
export class ShortPlannedAtPipe implements PipeTransform {
  constructor(
    private datePipe: DatePipe,
    @Inject(LOCALE_ID) private locale: string,
  ) {}

  transform(value: number | null, ...args: unknown[]): string | null {
    if (typeof value !== 'number') {
      return null;
    }

    const locale = this.locale;

    if (isToday(value)) {
      const str = `${new Date(value).toLocaleTimeString(locale, {
        hour: 'numeric',
        minute: 'numeric',
      })}`;
      // fallback as 12:00 PM is too long
      if (str.length >= 7) {
        return this.datePipe.transform(value, 'H:mm');
      }
      return str;
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

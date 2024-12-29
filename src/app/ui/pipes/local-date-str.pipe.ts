import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { dateStrToUtcDate } from '../../util/date-str-to-utc-date';

@Pipe({
  name: 'localDateStr',
  standalone: false,
})
export class LocalDateStrPipe implements PipeTransform {
  private datePipe = inject(DatePipe);
  private locale = inject(LOCALE_ID);

  transform(value: string | null, ...args: unknown[]): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const d = dateStrToUtcDate(value);
    return `${d.toLocaleDateString(this.locale, {
      month: 'numeric',
      day: 'numeric',
    })}`;

    // NOTE: not needed?
    // const lastChar = str.slice(-1);
    // if (isNaN(lastChar as any)) {
    //   return str.slice(0, -1);
    // }
  }
}

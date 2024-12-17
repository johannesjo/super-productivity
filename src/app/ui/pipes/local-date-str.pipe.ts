import { Inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';
import { dateStrToUtcDate } from '../../util/date-str-to-utc-date';

@Pipe({
  name: 'localDateStr',
  standalone: false,
})
export class LocalDateStrPipe implements PipeTransform {
  constructor(
    private datePipe: DatePipe,
    @Inject(LOCALE_ID) private locale: string,
  ) {}

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

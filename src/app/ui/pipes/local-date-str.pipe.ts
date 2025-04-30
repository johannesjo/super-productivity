import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';
import { dateStrToUtcDate } from '../../util/date-str-to-utc-date';
import { getWorklogStr } from '../../util/get-work-log-str';
import { TranslateService } from '@ngx-translate/core';
import { T } from 'src/app/t.const';

@Pipe({ name: 'localDateStr', standalone: true })
export class LocalDateStrPipe implements PipeTransform {
  private datePipe = inject(DatePipe);
  private locale = inject(LOCALE_ID);
  private translateService = inject(TranslateService);
  // TODO add today case

  transform(value: string | null, ...args: unknown[]): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    if (value === getWorklogStr()) {
      const translation = this.translateService.instant(T.G.TODAY_TAG_TITLE);
      if (translation.length <= 7) {
        return translation;
      }
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

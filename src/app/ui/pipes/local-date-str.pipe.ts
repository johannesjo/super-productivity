import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { dateStrToUtcDate } from '../../util/date-str-to-utc-date';
import { TranslateService } from '@ngx-translate/core';
import { T } from 'src/app/t.const';
import { getWorklogStr } from '../../util/get-work-log-str';

@Pipe({ name: 'localDateStr', standalone: true })
export class LocalDateStrPipe implements PipeTransform {
  private locale = inject(LOCALE_ID);
  private translateService = inject(TranslateService);

  transform(
    value: string | null | undefined,
    todayStr: string = getWorklogStr(),
  ): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    if (value === todayStr) {
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

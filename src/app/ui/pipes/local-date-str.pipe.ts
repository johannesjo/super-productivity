import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { dateStrToUtcDate } from '../../util/date-str-to-utc-date';
import { TranslateService } from '@ngx-translate/core';
import { T } from 'src/app/t.const';
import { getWorklogStr } from '../../util/get-work-log-str';
import { formatMonthDay } from '../../util/format-month-day.util';

@Pipe({
  name: 'localDateStr',
  standalone: true,
})
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
    return formatMonthDay(d, this.locale);
  }
}

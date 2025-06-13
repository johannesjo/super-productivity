import { DatePipe } from '@angular/common';
import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { dateStrToUtcDate } from '../../util/date-str-to-utc-date';
import { TranslateService } from '@ngx-translate/core';
import { T } from 'src/app/t.const';
import { getWorklogStr } from '../../util/get-work-log-str';

@Pipe({
  name: 'localDateStr',
  standalone: true,
})
export class LocalDateStrPipe implements PipeTransform {
  private locale = inject(LOCALE_ID);
  private translateService = inject(TranslateService);
  private datePipe = new DatePipe(this.locale);

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
    // Use Angular's DatePipe for consistent formatting with the rest of the app
    // 'shortDate' format will automatically adapt to the locale (M/d/yy for en-US, dd/MM/yy for en-GB, etc.)
    const shortDate = this.datePipe.transform(d, 'shortDate') || '';

    // Remove year from various locale formats:
    // en-US: "12/25/23" -> "12/25"
    // en-GB: "25/12/2023" -> "25/12"
    // de-DE: "25.12.23" -> "25.12"
    // fr-FR: "25/12/2023" -> "25/12"
    // ja-JP: "2023/12/25" -> "12/25" (special case - remove year from start)
    // ko-KR: "23. 12. 25." -> "12. 25."

    // Handle year at the end (most common): separator + 2-4 digits
    let result = shortDate.replace(/[\/\.\-\s]+\d{2,4}\.?$/, '');

    // Handle year at the beginning (like Japanese): 4 digits + separator
    result = result.replace(/^\d{4}[\/\.\-\s]+/, '');

    return result;
  }
}

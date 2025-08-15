import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DateTimeFormatService } from '../../core/date-time-format/date-time-format.service';

/**
 * Custom date pipe that respects the user's configured locale
 * Drop-in replacement for Angular's DatePipe
 */
@Pipe({
  name: 'localeDate',
  standalone: true,
  pure: false, // Need to be impure to react to locale changes
})
export class LocaleDatePipe implements PipeTransform {
  private _dateTimeFormatService = inject(DateTimeFormatService);
  private _defaultLocale = inject(LOCALE_ID);
  private _datePipe: DatePipe | null = null;
  private _lastLocale: string | undefined;

  transform(
    value: Date | string | number | null | undefined,
    format?: string,
    timezone?: string,
    locale?: string,
  ): string | null {
    // Use explicitly provided locale, configured locale, or default
    const effectiveLocale =
      locale || this._dateTimeFormatService.currentLocale || this._defaultLocale;

    // Create or recreate DatePipe if locale changed
    if (!this._datePipe || this._lastLocale !== effectiveLocale) {
      this._datePipe = new DatePipe(effectiveLocale);
      this._lastLocale = effectiveLocale;
    }

    return this._datePipe.transform(value, format, timezone);
  }
}

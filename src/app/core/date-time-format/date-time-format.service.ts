import { inject, Injectable } from '@angular/core';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { map, shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DateTimeFormatService {
  private readonly _globalConfigService = inject(GlobalConfigService);

  // Cache the current locale for synchronous access
  private _currentLocale: string | undefined = undefined;

  // Observable for the locale to use
  readonly locale$ = this._globalConfigService.lang$.pipe(
    map((langConfig) => langConfig.timeLocale || undefined),
    shareReplay(1),
  );

  // For detecting if current locale uses 24-hour format (used in schedule component)
  get is24HourFormat(): boolean {
    const testDate = new Date(2000, 0, 1, 13, 0, 0);
    const formatted = testDate.toLocaleTimeString(this._currentLocale, {
      hour: 'numeric',
      minute: '2-digit',
    });
    return formatted.includes('13');
  }

  // Get the current locale being used
  get currentLocale(): string | undefined {
    return this._currentLocale;
  }

  constructor() {
    // Subscribe to keep the cached locale updated
    this.locale$.subscribe((locale) => {
      this._currentLocale = locale;

      // Debug logging
      if (locale) {
        const testDate = new Date(2000, 0, 1, 13, 0, 0);
        const formatted = testDate.toLocaleTimeString(locale, {
          hour: 'numeric',
          minute: '2-digit',
        });
        console.log('[DateTimeFormat] Using locale:', locale);
        console.log('  - Test time (13:00):', formatted);
        console.log('  - Format:', formatted.includes('13') ? '24-hour' : '12-hour');
      } else {
        console.log('[DateTimeFormat] Using system default locale');
      }
    });
  }

  formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString(this._currentLocale, {
      hour: 'numeric',
      minute: 'numeric',
    });
  }
}

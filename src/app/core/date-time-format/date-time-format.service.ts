import { computed, inject, Injectable } from '@angular/core';
import { GlobalConfigService } from '../../features/config/global-config.service';

@Injectable({
  providedIn: 'root',
})
export class DateTimeFormatService {
  private readonly _globalConfigService = inject(GlobalConfigService);

  // Signal for the locale to use
  private readonly _locale = computed(
    () => this._globalConfigService.lang()?.timeLocale || undefined,
  );

  // For detecting if current locale uses 24-hour format (used in schedule component)
  readonly is24HourFormat = computed(() => {
    const testDate = new Date(2000, 0, 1, 13, 0, 0);
    const formatted = testDate.toLocaleTimeString(this._locale(), {
      hour: 'numeric',
      minute: '2-digit',
    });
    return formatted.includes('13');
  });

  // Get the current locale being used
  get currentLocale(): string | undefined {
    return this._locale();
  }

  constructor() {
    // Debug logging when locale changes
    const locale = this._locale();
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
  }

  formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString(this._locale(), {
      hour: 'numeric',
      minute: 'numeric',
    });
  }
}

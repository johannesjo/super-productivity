import { inject, Pipe, PipeTransform } from '@angular/core';
import { DateTimeFormatService } from '../../core/date-time-format/date-time-format.service';

/**
 * Plain time formatting pipe that respects 24-hour format
 * Returns plain text without HTML markup
 */
@Pipe({ name: 'shortTime' })
export class ShortTimePipe implements PipeTransform {
  private dateTimeFormatService = inject(DateTimeFormatService);

  transform(value: number | undefined | null): string | null {
    if (typeof value !== 'number') {
      return null;
    }

    return this.dateTimeFormatService.formatTime(value);
  }
}

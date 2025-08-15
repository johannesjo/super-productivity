import { inject, Pipe, PipeTransform } from '@angular/core';
import { ShortTimePipe } from './short-time.pipe';

/**
 * HTML time formatting pipe that adds styled AM/PM spans
 * Extends ShortTimePipe to add HTML markup for 12-hour format
 */
@Pipe({ name: 'shortTimeHtml' })
export class ShortTimeHtmlPipe implements PipeTransform {
  private shortTimePipe = inject(ShortTimePipe);

  transform(value: number | undefined | null): string | null {
    const formatted = this.shortTimePipe.transform(value);

    if (!formatted) {
      return null;
    }

    // Add HTML spans around AM/PM for styling (only present in 12-hour format)
    return formatted.replace('AM', '<span>AM</span>').replace('PM', '<span>PM</span>');
  }
}

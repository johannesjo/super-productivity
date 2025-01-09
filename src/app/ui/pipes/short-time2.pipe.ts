import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'shortTime2' })
export class ShortTime2Pipe implements PipeTransform {
  private locale = inject(LOCALE_ID);

  transform(value: number | undefined | null, ...args: unknown[]): string | null {
    if (typeof value !== 'number') {
      return null;
    }

    const locale = this.locale;
    const str = `${new Date(value).toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: 'numeric',
    })}`;
    return (
      str
        // .replace(' ', ' ')
        .replace(' ', ' ')
        .replace('AM', '<span>AM</span>')
        .replace('PM', '<span>PM</span>')
    );
  }
}

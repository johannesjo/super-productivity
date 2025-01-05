import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'shortDate2' })
export class ShortDate2Pipe implements PipeTransform {
  private locale = inject(LOCALE_ID);

  transform(value: number | null, ...args: unknown[]): string | null {
    if (typeof value !== 'number') {
      return null;
    }

    const locale = this.locale;

    const str = `${new Date(value).toLocaleDateString(locale, {
      month: 'numeric',
      day: 'numeric',
    })}`;

    const lastChar = str.slice(-1);

    if (isNaN(lastChar as any)) {
      return str.slice(0, -1);
    }
    return str;
  }
}

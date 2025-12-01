import { Pipe, PipeTransform } from '@angular/core';
import { formatDate } from '../../util/format-date';

@Pipe({ name: 'momentFormat' })
export class MomentFormatPipe implements PipeTransform {
  transform(
    value: number | Date | string | null | undefined,
    args: string | null | undefined,
  ): string | null {
    if (value && args) {
      const result = formatDate(value, args);
      return result || null;
    }
    return null;
  }
}

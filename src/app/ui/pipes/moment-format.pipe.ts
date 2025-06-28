import { Pipe, PipeTransform } from '@angular/core';
import { formatDate } from '../../util/format-date';

@Pipe({ name: 'momentFormat' })
export class MomentFormatPipe implements PipeTransform {
  transform(value: any, args: any): any {
    if (value && args) {
      const result = formatDate(value, args);
      return result || null;
    }
    return null;
  }
}

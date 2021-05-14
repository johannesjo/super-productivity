import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';
import { isToday } from '../../util/is-today.util';

@Pipe({
  name: 'shortPlannedAt',
})
export class ShortPlannedAtPipe implements PipeTransform {
  constructor(private datePipe: DatePipe) {}

  transform(value: number | null, ...args: unknown[]): string | null {
    if (typeof value !== 'number') {
      return null;
    }

    if (isToday(value)) {
      return this.datePipe.transform(value, 'H:mm');
    } else {
      return this.datePipe.transform(value, 'd.M');
    }
  }
}

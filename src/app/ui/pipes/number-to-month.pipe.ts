import { Pipe, PipeTransform } from '@angular/core';

const MAP = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

@Pipe({ name: 'numberToMonth' })
export class NumberToMonthPipe implements PipeTransform {
  transform(value: any, args?: any): any {
    return MAP[parseInt(value, 10) - 1];
  }
}

/**
 * numberFixedLen.pipe
 */

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numberFixedLen',
})
export class NumberFixedLenPipe implements PipeTransform {
  transform(num: number, len: number): any {
    const number = Math.floor(num);
    const length = Math.floor(len);

    if (num === null || isNaN(number) || isNaN(length)) {
      return num;
    }

    let numString = number.toString();

    while (numString.length < length) {
      numString = '0' + numString;
    }

    return numString;
  }
}

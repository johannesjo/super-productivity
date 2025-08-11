import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'sort' })
export class SortPipe implements PipeTransform {
  transform<T extends Record<string, unknown>>(
    array: T[],
    field: keyof T,
    reverse: boolean = false,
  ): T[] {
    const f = reverse ? -1 : 1;

    if (!Array.isArray(array)) {
      return array;
    }
    const arr = [...array];
    arr.sort((a: T, b: T) => {
      if (a[field] < b[field]) {
        return -1 * f;
      } else if (a[field] > b[field]) {
        return 1 * f;
      } else {
        return 0;
      }
    });

    return arr;
  }
}

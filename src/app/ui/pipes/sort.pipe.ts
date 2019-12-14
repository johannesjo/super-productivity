import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'sort'
})
export class SortPipe implements PipeTransform {
  transform(array: any[], field: string, reverse = false): any[] {
    const f = reverse ? -1 : 1;

    if (!Array.isArray(array)) {
      return array;
    }
    const arr = [...array];
    arr.sort((a: any, b: any) => {
      console.log(a[field] < b[field], a[field], b[field]);

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

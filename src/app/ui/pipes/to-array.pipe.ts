import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'toArray',
  pure: false,
})
export class ToArrayPipe implements PipeTransform {
  transform(obj: any, filterOutKeys?: any): any {
    if (obj === Object(obj)) {
      const keys = Object.keys(obj);

      if (typeof filterOutKeys === 'string') {
        const index = keys.indexOf(filterOutKeys);
        if (index > -1) {
          keys.splice(index, 1);
        }
      }
      const newArray: any[] = [];
      keys.forEach((key) => {
        newArray.push({
          key,
          value: obj[key],
        });
      });

      return newArray;
    }

    return null;
  }
}

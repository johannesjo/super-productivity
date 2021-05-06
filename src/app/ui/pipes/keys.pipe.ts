import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'keys',
  pure: false,
})
export class KeysPipe implements PipeTransform {
  transform(value: any, sort: any, filterOutKeys?: any): any {
    if (value === Object(value)) {
      const keys = Object.keys(value);

      if (typeof filterOutKeys === 'string') {
        const index = keys.indexOf(filterOutKeys);
        if (index > -1) {
          keys.splice(index, 1);
        }
      }

      if (sort) {
        keys.sort();
      }

      if (sort === 'reverse') {
        keys.reverse();
      }

      return keys;
    }

    return null;
  }
}

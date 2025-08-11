import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'toArray',
  pure: false,
})
export class ToArrayPipe implements PipeTransform {
  transform(
    obj: Record<string, unknown> | null | undefined,
    filterOutKeys?: string | string[],
  ): Array<{ key: string; value: unknown }> | null {
    if (obj && obj === Object(obj)) {
      const keys = Object.keys(obj);

      if (typeof filterOutKeys === 'string') {
        const index = keys.indexOf(filterOutKeys);
        if (index > -1) {
          keys.splice(index, 1);
        }
      } else if (Array.isArray(filterOutKeys)) {
        filterOutKeys.forEach((key) => {
          const index = keys.indexOf(key);
          if (index > -1) {
            keys.splice(index, 1);
          }
        });
      }
      const newArray: Array<{ key: string; value: unknown }> = [];
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

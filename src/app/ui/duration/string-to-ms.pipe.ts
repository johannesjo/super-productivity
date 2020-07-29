import { Pipe, PipeTransform } from '@angular/core';

export const stringToMs = (strValue: string, args?: any): number => {
  if (!strValue) {
    return 0;
  }

  let d: number | undefined;
  let h: number | undefined;
  let m: number | undefined;
  let s: number | undefined;

  const arrValue = strValue.split(' ');

  arrValue.forEach((val: string) => {
    if (val.length > 0) {
      const lastChar = val.slice(-1);
      const amount = parseInt(val.slice(0, val.length - 1), 10);

      if (lastChar === 's') {
        s = amount;
      }
      if (lastChar === 'm') {
        m = amount;
      }
      if (lastChar === 'h') {
        h = amount;
      }
      if (lastChar === 'd') {
        d = amount;
      }
    }
  });

  if (typeof s === 'number' || typeof m === 'number' || typeof h === 'number' || typeof d === 'number') {
    s = (typeof s === 'number' && !isNaN(s)) ? s : 0;
    m = (typeof m === 'number' && !isNaN(m)) ? m : 0;
    h = (typeof h === 'number' && !isNaN(h)) ? h : 0;
    d = (typeof d === 'number' && !isNaN(d)) ? d : 0;

    return +(s * 1000)
      + (m * 1000 * 60)
      + (h * 1000 * 60 * 60)
      + (d * 1000 * 60 * 60 * 24);
  } else {
    return 0;
  }
};

@Pipe({
  name: 'stringToMs'
})
export class StringToMsPipe implements PipeTransform {
  transform: (value: any, ...args: any[]) => any = stringToMs;
}

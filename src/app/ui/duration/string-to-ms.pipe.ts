import { Pipe, PipeTransform } from '@angular/core';

export const stringToMs = (strValue: string, args?: any): number => {
  if (!strValue) {
    return 0;
  }

  // First try to parse simple formats like "1.5h", "30m", etc.
  const simpleFormatMatch = strValue.trim().match(/^([0-9]*\.?[0-9]+)([smhd])$/i);
  if (simpleFormatMatch) {
    const amount = parseFloat(simpleFormatMatch[1]);
    const unit = simpleFormatMatch[2].toLowerCase();

    switch (unit) {
      case 's':
        return amount * 1000;
      case 'm':
        return amount * 1000 * 60;
      case 'h':
        return amount * 1000 * 60 * 60;
      case 'd':
        return amount * 1000 * 60 * 60 * 24;
    }
  }

  let d: number | undefined;
  let h: number | undefined;
  let m: number | undefined;
  let s: number | undefined;
  let previousLastChar: string | undefined;

  // Add spaces after letters to ease further splitting.
  strValue = strValue.replace(/([a-zA-Z]+)\s*/g, '$1 ');
  // Replace commas by dots to allow using them as float separator.
  strValue = strValue.replace(',', '.');

  const arrValue = strValue.trim().split(' ');

  arrValue.forEach((val: string) => {
    if (val.length > 0) {
      const lastChar = val.slice(-1).toLowerCase();
      const amount = parseFloat(val);

      if (lastChar === 's') {
        s = amount;
      } else if (lastChar === 'm') {
        m = amount;
      } else if (lastChar === 'h') {
        h = amount;
      } else if (lastChar === 'd') {
        d = amount;
      } else {
        if (previousLastChar === 's') {
          // Don't track milliseconds.
        } else if (previousLastChar === 'm') {
          s = amount;
        } else if (previousLastChar === 'h') {
          m = amount;
        } else if (previousLastChar === 'd') {
          h = amount;
        }
      }
      previousLastChar = lastChar;
    }
  });

  if (
    typeof s === 'number' ||
    typeof m === 'number' ||
    typeof h === 'number' ||
    typeof d === 'number'
  ) {
    s = typeof s === 'number' && !isNaN(s) ? s : 0;
    m = typeof m === 'number' && !isNaN(m) ? m : 0;
    h = typeof h === 'number' && !isNaN(h) ? h : 0;
    d = typeof d === 'number' && !isNaN(d) ? d : 0;

    // prettier-ignore
    return +(s * 1000)
      + (m * 1000 * 60)
      + (h * 1000 * 60 * 60)
      + (d * 1000 * 60 * 60 * 24);
  } else {
    return 0;
  }
};

@Pipe({ name: 'stringToMs' })
export class StringToMsPipe implements PipeTransform {
  transform: (value: any, ...args: any[]) => any = stringToMs;
}

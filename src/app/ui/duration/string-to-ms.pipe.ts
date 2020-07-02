import { Pipe, PipeTransform } from '@angular/core';

export const stringToMs = (strValue: any, args?: any): any => {
  if (!strValue) {
    return;
  }

  let days;
  let hours;
  let minutes;
  let seconds;
  let isValid;

  const arrValue = strValue ? strValue.split(' ') : [];

  arrValue.forEach((val) => {
    if (val.length > 0) {
      const lastChar = val.slice(-1);
      const amount = parseInt(val.slice(0, val.length - 1), 10);

      if (lastChar === 's') {
        seconds = amount;
      }
      if (lastChar === 'm') {
        minutes = amount;
      }
      if (lastChar === 'h') {
        hours = amount;
      }
      if (lastChar === 'd') {
        days = amount;
      }
    }
  });
  isValid = seconds || minutes || hours || days || false;

  if (isValid) {
    return +((seconds * 1000) || 0)
      + ((minutes * 1000 * 60) || 0)
      + ((hours * 1000 * 60 * 60) || 0)
      + ((days * 1000 * 60 * 60 * 24) || 0);
  } else {
    return null;
  }
};

@Pipe({
  name: 'stringToMs'
})
export class StringToMsPipe implements PipeTransform {
  transform: (value: any, ...args: any[]) => any = stringToMs;
}

import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({
  name: 'durationFromString'
})
export class DurationFromStringPipe implements PipeTransform {
  transform: (value: any, ...args: any[]) = durationFromString;
}

export const durationFromString = (strValue: any, args?: any): any => {
  if (!strValue) {
    return;
  }

  let days;
  let hours;
  let minutes;
  let seconds;
  let momentVal;
  let isValid;

  const arrValue = strValue.split(' ');

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
    momentVal = moment.duration({
      days,
      hours,
      minutes,
      seconds,
    });

    if (momentVal.asSeconds() > 0) {
      return momentVal;
    } else {
      return null;
    }
  } else {
    return null;
  }
};

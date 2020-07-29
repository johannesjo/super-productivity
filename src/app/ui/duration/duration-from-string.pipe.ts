import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';
import { stringToMs } from './string-to-ms.pipe';

@Pipe({
  name: 'durationFromString'
})
export class DurationFromStringPipe implements PipeTransform {
  transform: (value: any, ...args: any[]) => any = durationFromString;
}

export const durationFromString = (strValue: any, args?: any): any => {
  const milliseconds = stringToMs(strValue);
  if (milliseconds > 0) {
    return moment.duration({
      milliseconds,
    });
  } else {
    return null;
  }
};

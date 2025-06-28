import { Pipe, PipeTransform } from '@angular/core';
import { stringToMs } from './string-to-ms.pipe';
import { SimpleDuration } from '../../util/round-duration';

@Pipe({ name: 'durationFromString' })
export class DurationFromStringPipe implements PipeTransform {
  transform: (value: any, ...args: any[]) => any = durationFromString;
}

export const durationFromString = (strValue: any, args?: any): SimpleDuration | null => {
  const milliseconds = stringToMs(strValue);
  if (milliseconds > 0) {
    return {
      asMilliseconds: () => milliseconds,
    };
  } else {
    return null;
  }
};

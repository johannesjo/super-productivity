import { Pipe, PipeTransform } from '@angular/core';
import { stringToMs } from './string-to-ms.pipe';
import { SimpleDuration } from '../../util/round-duration';

@Pipe({ name: 'durationFromString' })
export class DurationFromStringPipe implements PipeTransform {
  transform: (
    value: string | null | undefined,
    ...args: unknown[]
  ) => SimpleDuration | null = durationFromString;
}

export const durationFromString = (
  strValue: string | null | undefined,
  args?: unknown,
): SimpleDuration | null => {
  const milliseconds = stringToMs(strValue || '');
  if (milliseconds > 0) {
    return {
      asMilliseconds: () => milliseconds,
    };
  } else {
    return null;
  }
};

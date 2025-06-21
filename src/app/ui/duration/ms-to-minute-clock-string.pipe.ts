import { Pipe, PipeTransform } from '@angular/core';

export const msToMinuteClockString = (value: any): string => {
  const totalMs = Number(value) || 0;
  const totalSeconds = Math.floor(Math.abs(totalMs) / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const sign = totalMs < 0 ? '-' : '';

  const parsed = sign + totalMinutes + ':' + ('00' + seconds).slice(-2);

  return parsed.trim();
};

@Pipe({ name: 'msToMinuteClockString' })
export class MsToMinuteClockStringPipe implements PipeTransform {
  transform: (value: any, ...args: any[]) => any = msToMinuteClockString;
}

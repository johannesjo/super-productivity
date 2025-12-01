import { Pipe, PipeTransform } from '@angular/core';

export const msToClockString = (
  value: number | null | undefined,
  showSeconds?: boolean,
  isHideEmptyPlaceholder?: boolean,
): string => {
  const totalMs = Number(value) || 0;
  const totalSeconds = Math.floor(Math.abs(totalMs) / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);

  const hours = totalHours;
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;

  const sign = totalMs < 0 ? '-' : '';

  const parsed =
    sign +
    hours +
    ':' +
    ('00' + minutes).slice(-2) +
    (showSeconds ? ':' + ('00' + seconds).slice(-2) : '');

  if (!isHideEmptyPlaceholder && parsed.trim() === '0:00') {
    return '-';
  }

  return parsed.trim();
};

@Pipe({ name: 'msToClockString' })
export class MsToClockStringPipe implements PipeTransform {
  transform: (value: number | null | undefined, ...args: [boolean?, boolean?]) => string =
    msToClockString;
}

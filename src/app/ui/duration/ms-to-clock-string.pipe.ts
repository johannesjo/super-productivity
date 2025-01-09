import { Pipe, PipeTransform } from '@angular/core';
import moment from 'moment';

export const msToClockString = (
  value: any,
  showSeconds?: boolean,
  isHideEmptyPlaceholder?: boolean,
): string => {
  const md = moment.duration(value);
  let hours = 0;
  if (+md.days() > 0) {
    hours = md.days() * 24;
  }
  if (+md.hours() > 0) {
    hours += md.hours();
  }
  const parsed =
    hours +
    ':' +
    ('00' + +md.minutes()).slice(-2) +
    (showSeconds ? ':' + ('00' + +md.seconds()).slice(-2) : '');

  if (!isHideEmptyPlaceholder && parsed.trim() === '0:00') {
    return '-';
  }

  return parsed.trim();
};

@Pipe({ name: 'msToClockString' })
export class MsToClockStringPipe implements PipeTransform {
  transform: (value: any, ...args: any[]) => any = msToClockString;
}
